use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillBridgeInfo {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relay_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mcp_url: Option<String>,
}

impl Default for SkillBridgeInfo {
    fn default() -> Self {
        Self {
            status: "not-installed".to_string(),
            version: None,
            relay_url: None,
            mcp_url: None,
        }
    }
}

#[derive(Debug, Deserialize)]
struct SkillBridgeConfig {
    #[serde(rename = "bridgeActive")]
    bridge_active: Option<bool>,
    #[serde(rename = "relayUrl")]
    relay_url: Option<String>,
    #[serde(rename = "mcpUrl")]
    mcp_url: Option<String>,
    version: Option<String>,
}

pub fn detect_skillbridge() -> SkillBridgeInfo {
    let mut info = SkillBridgeInfo::default();

    if let Some(app_path) = check_app_path() {
        if !app_path.exists() {
            return info;
        }
        info.status = "installed".to_string();
    } else {
        return info;
    }

    if is_process_running() {
        info.status = "running".to_string();
    }

    if let Some(config) = read_config() {
        if config.bridge_active == Some(true) {
            info.status = "bridge-active".to_string();
        }
        info.relay_url = config.relay_url;
        info.mcp_url = config.mcp_url;
        info.version = config.version;
    }

    info
}

fn check_app_path() -> Option<PathBuf> {
    let app_path = PathBuf::from("/Applications/SkillBridge.app");
    if app_path.exists() {
        Some(app_path)
    } else {
        None
    }
}

fn is_process_running() -> bool {
    let output = Command::new("pgrep")
        .args(["-x", "SkillBridge"])
        .output();

    match output {
        Ok(result) => result.status.success(),
        Err(_) => {
            let ps_output = Command::new("ps")
                .args(["aux"])
                .output();
            
            match ps_output {
                Ok(out) => {
                    let output_str = String::from_utf8_lossy(&out.stdout);
                    output_str.contains("SkillBridge")
                }
                Err(_) => false,
            }
        }
    }
}

fn read_config() -> Option<SkillBridgeConfig> {
    let home = env::var("HOME").ok()?;
    let config_path = PathBuf::from(home).join(".skillbridge").join("config.json");
    
    let content = fs::read_to_string(config_path).ok()?;
    let config: SkillBridgeConfig = serde_json::from_str(&content).ok()?;
    
    Some(config)
}