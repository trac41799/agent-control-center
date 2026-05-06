use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;
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

        let output_tx_clone = output_tx.clone();

        tokio::spawn(async move {
            let mut stdout_reader = BufReader::new(stdout).lines();

            loop {
                tokio::select! {
                    _ = kill_rx.recv() => {
                        break;
                    }
                    line = stdout_reader.next_line() => {
                        match line {
                            Ok(Some(l)) => {
                                let _ = output_tx_clone.send(format!("[stdout] {}", l));
                            }
                            Ok(None) => {
                                break;
                            }
                            Err(e) => {
                                let _ = output_tx_clone.send(format!("[error] stdout read error: {}", e));
                                break;
                            }
                        }
                    }
                }
            }
        });

        let output_tx_stderr = output_tx.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = output_tx_stderr.send(format!("[stderr] {}", line));
            }
        });

        let handle = ProcessHandle {
            child: Some(child),
            output_rx: Some(output_rx),
            status: AgentStatus::Running,
            started_at: now,
            project_path,
            session_id: session_id.clone(),
            kill_sender: Some(kill_tx),
        };

        let mut processes = self.registry.processes.lock().await;
        processes.insert(agent_id.clone(), handle);

        Ok(session_id)
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
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}