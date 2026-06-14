use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, ChildStderr, ChildStdout};
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};
use tokio::sync::Mutex;

#[derive(Debug, Clone, PartialEq)]
pub enum AgentStatus {
    Starting,
    Running,
    Stopped,
    Error,
}

impl std::fmt::Display for AgentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentStatus::Starting => write!(f, "Starting"),
            AgentStatus::Running => write!(f, "Running"),
            AgentStatus::Stopped => write!(f, "Stopped"),
            AgentStatus::Error => write!(f, "Error"),
        }
    }
}

pub struct ProcessHandle {
    pub child: Option<Child>,
    pub output_rx: Option<UnboundedReceiver<String>>,
    pub status: AgentStatus,
    pub started_at: DateTime<Utc>,
    pub project_path: String,
    pub session_id: String,
    pub kill_sender: Option<UnboundedSender<()>>,
    /// Additional output subscribers (used by the guard loop to read the same stream).
    pub output_subscribers: Vec<UnboundedSender<String>>,
}

pub struct ProcessRegistry {
    pub processes: Mutex<HashMap<String, ProcessHandle>>,
}

impl Default for ProcessRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessRegistry {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AgentProcessInfo {
    pub session_id: String,
    pub status: String,
    pub started_at: String,
    pub project_path: String,
}

impl From<&ProcessHandle> for AgentProcessInfo {
    fn from(handle: &ProcessHandle) -> Self {
        Self {
            session_id: handle.session_id.clone(),
            status: handle.status.to_string(),
            started_at: handle.started_at.to_rfc3339(),
            project_path: handle.project_path.clone(),
        }
    }
}

pub struct PtyManager {
    registry: Arc<ProcessRegistry>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            registry: Arc::new(ProcessRegistry::new()),
        }
    }

    pub fn registry(&self) -> Arc<ProcessRegistry> {
        self.registry.clone()
    }

    pub async fn spawn_process(
        &self,
        agent_id: String,
        project_path: String,
        command: String,
        args: Vec<String>,
        env_vars: HashMap<String, String>,
    ) -> Result<String, String> {
        self.spawn_process_with_guards(agent_id, project_path, command, args, env_vars, None, None)
            .await
    }

    /// Spawn a process with optional time and cost caps.
    pub async fn spawn_process_with_guards(
        &self,
        agent_id: String,
        project_path: String,
        command: String,
        args: Vec<String>,
        env_vars: HashMap<String, String>,
        deadline_secs: Option<u64>,
        cost_cap_usd: Option<f64>,
    ) -> Result<String, String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();

        let (kill_tx, mut kill_rx) = mpsc::unbounded_channel();
        let (output_tx, output_rx) = mpsc::unbounded_channel();

        let mut cmd = tokio::process::Command::new(&command);
        cmd.args(&args)
            .current_dir(&project_path)
            .envs(env_vars)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn process: {}", e))?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        let handle = ProcessHandle {
            child: Some(child),
            output_rx: Some(output_rx),
            status: AgentStatus::Running,
            started_at: now,
            project_path,
            session_id: session_id.clone(),
            kill_sender: Some(kill_tx),
            output_subscribers: Vec::new(),
        };

        let mut processes = self.registry.processes.lock().await;
        processes.insert(agent_id.clone(), handle);

        // If guards requested, register a guard subscriber before starting readers.
        if deadline_secs.is_some() || cost_cap_usd.is_some() {
            let (g_kill_tx, g_output_rx) = self.register_guard_subscriber(&agent_id).await?;
            let guards = crate::pty_guards::ProcessGuards::new(
                deadline_secs,
                cost_cap_usd,
                g_kill_tx,
            );
            let arc = std::sync::Arc::new(tokio::sync::Mutex::new(guards));
            tokio::spawn(async move {
                crate::pty_guards::run_guards(arc, g_output_rx).await;
            });
        }

        // Start the stdout reader with broadcast to subscribers.
        let registry_for_stdout = self.registry.clone();
        let agent_id_for_stdout = agent_id.clone();
        let output_tx_for_stdout = output_tx.clone();
        tokio::spawn(async move {
            read_stdout_broadcast(
                stdout,
                registry_for_stdout,
                agent_id_for_stdout,
                output_tx_for_stdout,
                &mut kill_rx,
            )
            .await;
        });

        // Start the stderr reader (no broadcast needed, but send to subscribers too).
        let registry_for_stderr = self.registry.clone();
        let agent_id_for_stderr = agent_id.clone();
        let output_tx_for_stderr = output_tx.clone();
        tokio::spawn(async move {
            read_stderr_broadcast(
                stderr,
                registry_for_stderr,
                agent_id_for_stderr,
                output_tx_for_stderr,
            )
            .await;
        });

        Ok(session_id)
    }

    /// Register a guard subscriber: takes the existing kill_sender, and adds a
    /// new output subscriber that will receive all output lines.
    async fn register_guard_subscriber(
        &self,
        agent_id: &str,
    ) -> Result<(UnboundedSender<()>, UnboundedReceiver<String>), String> {
        let mut processes = self.registry.processes.lock().await;
        let handle = processes
            .get_mut(agent_id)
            .ok_or_else(|| format!("Process {} not found", agent_id))?;
        let kill_tx = handle
            .kill_sender
            .take()
            .ok_or_else(|| "kill_sender already taken".to_string())?;
        let (tx, rx) = mpsc::unbounded_channel();
        handle.output_subscribers.push(tx);
        Ok((kill_tx, rx))
    }

    pub async fn kill_process(&self, agent_id: &str) -> Result<(), String> {
        let mut processes = self.registry.processes.lock().await;

        if let Some(handle) = processes.remove(agent_id) {
            if let Some(kill_tx) = handle.kill_sender {
                let _ = kill_tx.send(());
            }

            if let Some(mut child) = handle.child {
                let _ = child.kill().await;
            }

            Ok(())
        } else {
            Err(format!("Process {} not found", agent_id))
        }
    }

    pub async fn write_to_process(&self, agent_id: &str, text: &str) -> Result<(), String> {
        let mut processes = self.registry.processes.lock().await;

        if let Some(handle) = processes.get_mut(agent_id) {
            if let Some(ref mut child) = handle.child {
                if let Some(ref mut stdin) = child.stdin {
                    use tokio::io::AsyncWriteExt;
                    stdin
                        .write_all(text.as_bytes())
                        .await
                        .map_err(|e| format!("Failed to write to stdin: {}", e))?;
                    stdin
                        .flush()
                        .await
                        .map_err(|e| format!("Failed to flush stdin: {}", e))?;
                    return Ok(());
                }
            }
            Err(format!("No stdin available for process {}", agent_id))
        } else {
            Err(format!("Process {} not found", agent_id))
        }
    }

    pub async fn list_processes(&self) -> Vec<AgentProcessInfo> {
        let processes = self.registry.processes.lock().await;
        processes
            .iter()
            .map(|(_agent_id, handle)| AgentProcessInfo {
                session_id: handle.session_id.clone(),
                status: handle.status.to_string(),
                started_at: handle.started_at.to_rfc3339(),
                project_path: handle.project_path.clone(),
            })
            .collect()
    }

    pub async fn get_output_receiver(
        &self,
        agent_id: &str,
    ) -> Result<Option<UnboundedReceiver<String>>, String> {
        let mut processes = self.registry.processes.lock().await;
        if let Some(handle) = processes.get_mut(agent_id) {
            Ok(handle.output_rx.take())
        } else {
            Err(format!("Process {} not found", agent_id))
        }
    }

    pub async fn snapshot_active_agents(&self) -> Vec<ActiveAgentSnapshot> {
        let processes = self.registry.processes.lock().await;
        processes
            .iter()
            .map(|(agent_id, handle)| ActiveAgentSnapshot {
                agent_id: agent_id.clone(),
                session_id: handle.session_id.clone(),
                status: handle.status.to_string(),
                project_path: handle.project_path.clone(),
                started_at: handle.started_at.to_rfc3339(),
            })
            .collect()
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAgentSnapshot {
    pub agent_id: String,
    pub session_id: String,
    pub status: String,
    pub project_path: String,
    pub started_at: String,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Read stdout lines, broadcasting each to the output channel and any subscribers.
async fn read_stdout_broadcast(
    stdout: ChildStdout,
    registry: Arc<ProcessRegistry>,
    agent_id: String,
    output_tx: UnboundedSender<String>,
    kill_rx: &mut UnboundedReceiver<()>,
) {
    let mut stdout_reader = BufReader::new(stdout).lines();
    loop {
        tokio::select! {
            _ = kill_rx.recv() => break,
            line = stdout_reader.next_line() => {
                match line {
                    Ok(Some(l)) => {
                        let formatted = format!("[stdout] {}", l);
                        let _ = output_tx.send(formatted.clone());
                        broadcast_line(&registry, &agent_id, &formatted).await;
                    }
                    Ok(None) => break,
                    Err(e) => {
                        let msg = format!("[error] stdout read error: {}", e);
                        let _ = output_tx.send(msg.clone());
                        broadcast_line(&registry, &agent_id, &msg).await;
                        break;
                    }
                }
            }
        }
    }
}

/// Read stderr lines, broadcasting to subscribers (the main output channel doesn't
/// need stderr forwarded since the kill logic comes from stdout).
async fn read_stderr_broadcast(
    stderr: ChildStderr,
    registry: Arc<ProcessRegistry>,
    agent_id: String,
    _output_tx: UnboundedSender<String>,
) {
    let mut reader = BufReader::new(stderr).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let formatted = format!("[stderr] {}", line);
        broadcast_line(&registry, &agent_id, &formatted).await;
    }
}

/// Forward a line to all output subscribers of the given agent.
async fn broadcast_line(registry: &Arc<ProcessRegistry>, agent_id: &str, line: &str) {
    let mut processes = registry.processes.lock().await;
    if let Some(handle) = processes.get_mut(agent_id) {
        handle.output_subscribers.retain(|tx| tx.send(line.to_string()).is_ok());
    }
}
