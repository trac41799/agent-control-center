// src-tauri/src/pty_guards.rs
//
// T2: Process Hardening - Time + Cost Caps (Closes G4 + G5)
// Per-agent time deadline and cost cap. When either is hit, the agent is killed.

use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct ProcessGuards {
    pub deadline: Option<Instant>,
    pub cost_cap_usd: Option<f64>,
    pub current_cost_usd: f64,
    pub kill_tx: UnboundedSender<()>,
}

impl ProcessGuards {
    pub fn new(
        deadline_secs: Option<u64>,
        cost_cap_usd: Option<f64>,
        kill_tx: UnboundedSender<()>,
    ) -> Self {
        let deadline = deadline_secs.map(|s| Instant::now() + Duration::from_secs(s));
        Self {
            deadline,
            cost_cap_usd,
            current_cost_usd: 0.0,
            kill_tx,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.deadline.is_some_and(|d| Instant::now() > d)
    }

    pub fn is_over_budget(&self) -> bool {
        match self.cost_cap_usd {
            Some(cap) => self.current_cost_usd > cap,
            None => false,
        }
    }

    pub fn record_cost(&mut self, cost: f64) {
        if cost > 0.0 && cost.is_finite() {
            self.current_cost_usd += cost;
        }
    }

    pub fn current_cost(&self) -> f64 {
        self.current_cost_usd
    }

    pub fn kill(&self) {
        let _ = self.kill_tx.send(());
    }
}

/// Parse cost from a single line of agent output.
/// Recognizes: {"cost_usd": 0.012} or {"usage": {"cost": 0.012}}
pub fn parse_cost_from_output(line: &str) -> Option<f64> {
    let trimmed = line.trim();
    if !trimmed.starts_with('{') {
        return None;
    }
    let v: serde_json::Value = serde_json::from_str(trimmed).ok()?;
    if let Some(c) = v.get("cost_usd").and_then(|x| x.as_f64()) {
        return Some(c);
    }
    if let Some(c) = v.get("usage").and_then(|u| u.get("cost")).and_then(|x| x.as_f64()) {
        return Some(c);
    }
    None
}

/// Run the guard loop. Reads from `output_rx`, parses cost from each line,
/// ticks every 5 seconds, and sends kill on expiry or budget overflow.
/// Returns when the output stream ends or the process is killed.
pub async fn run_guards(
    guards_arc: Arc<Mutex<ProcessGuards>>,
    mut output_rx: UnboundedReceiver<String>,
) {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let g = guards_arc.lock().await;
                if g.is_expired() || g.is_over_budget() {
                    g.kill();
                    break;
                }
            }
            maybe_line = output_rx.recv() => {
                match maybe_line {
                    Some(line) => {
                        if let Some(cost) = parse_cost_from_output(&line) {
                            let mut g = guards_arc.lock().await;
                            g.record_cost(cost);
                            if g.is_over_budget() {
                                g.kill();
                                break;
                            }
                        }
                    }
                    None => break, // output stream ended
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;

    #[test]
    fn test_new_no_caps() {
        let (tx, _rx) = mpsc::unbounded_channel();
        let g = ProcessGuards::new(None, None, tx);
        assert!(!g.is_expired());
        assert!(!g.is_over_budget());
        assert_eq!(g.current_cost(), 0.0);
    }

    #[test]
    fn test_is_expired_with_past_deadline() {
        let (tx, _rx) = mpsc::unbounded_channel();
        // Create a guard that's already expired
        let mut g = ProcessGuards::new(Some(0), None, tx);
        std::thread::sleep(Duration::from_millis(10));
        assert!(g.is_expired());
    }

    #[test]
    fn test_is_over_budget() {
        let (tx, _rx) = mpsc::unbounded_channel();
        let mut g = ProcessGuards::new(None, Some(1.0), tx);
        assert!(!g.is_over_budget());
        g.record_cost(0.5);
        assert!(!g.is_over_budget());
        g.record_cost(0.6);
        assert!(g.is_over_budget());
    }

    #[test]
    fn test_record_cost_ignores_invalid() {
        let (tx, _rx) = mpsc::unbounded_channel();
        let mut g = ProcessGuards::new(None, Some(1.0), tx);
        g.record_cost(-0.5); // negative
        g.record_cost(f64::NAN); // NaN
        g.record_cost(f64::INFINITY); // infinity
        assert_eq!(g.current_cost(), 0.0);
    }

    #[test]
    fn test_parse_cost_usd_field() {
        let line = r#"{"cost_usd": 0.012, "model": "mimo"}"#;
        assert_eq!(parse_cost_from_output(line), Some(0.012));
    }

    #[test]
    fn test_parse_cost_usage_field() {
        let line = r#"{"usage": {"cost": 0.045, "tokens": 1234}}"#;
        assert_eq!(parse_cost_from_output(line), Some(0.045));
    }

    #[test]
    fn test_parse_cost_non_json() {
        assert_eq!(parse_cost_from_output("hello world"), None);
        assert_eq!(parse_cost_from_output(""), None);
        assert_eq!(parse_cost_from_output("[1,2,3]"), None);
    }

    #[test]
    fn test_parse_cost_no_cost_field() {
        let line = r#"{"model": "mimo", "tokens": 100}"#;
        assert_eq!(parse_cost_from_output(line), None);
    }

    #[tokio::test]
    async fn test_run_guards_kills_on_over_budget() {
        let (kill_tx, mut kill_rx) = mpsc::unbounded_channel();
        let (out_tx, out_rx) = mpsc::unbounded_channel();

        let g = ProcessGuards::new(None, Some(0.10), kill_tx);
        let arc = Arc::new(Mutex::new(g));

        let arc_clone = arc.clone();
        let task = tokio::spawn(async move {
            run_guards(arc_clone, out_rx).await;
        });

        // Send a line that pushes us over budget
        out_tx.send(r#"{"cost_usd": 0.15}"#.to_string()).unwrap();

        // Should receive kill signal
        let received = tokio::time::timeout(Duration::from_secs(2), kill_rx.recv()).await;
        assert!(received.is_ok(), "expected kill signal within 2s");
        assert!(received.unwrap().is_some());

        task.abort();
    }

    #[tokio::test]
    async fn test_run_guards_exits_on_output_end() {
        let (kill_tx, _kill_rx) = mpsc::unbounded_channel();
        let (out_tx, out_rx) = mpsc::unbounded_channel();

        let g = ProcessGuards::new(None, None, kill_tx);
        let arc = Arc::new(Mutex::new(g));

        let arc_clone = arc.clone();
        let task = tokio::spawn(async move {
            run_guards(arc_clone, out_rx).await;
        });

        drop(out_tx); // end the output stream

        // run_guards should exit cleanly
        let result = tokio::time::timeout(Duration::from_secs(2), task).await;
        assert!(result.is_ok(), "run_guards did not exit on stream end");
    }
}
