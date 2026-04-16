use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 插件清单
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_app_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platforms: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backends: Option<Vec<String>>,
    pub main: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readme: Option<String>,
}

/// 插件信息
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginInfo {
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    pub path: String,
    pub installed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_app_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outdated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_url: Option<String>,
}

/// 插件版本信息
#[derive(Debug, Serialize, Deserialize)]
pub struct PluginVersionInfo {
    pub name: String,
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_notes: String,
    pub download_url: String,
}

/// 应用版本
#[derive(Debug, Serialize, Deserialize)]
pub struct AppVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub string: String,
}

/// 读取插件目录
#[tauri::command]
pub fn list_plugins(app: tauri::AppHandle) -> Result<Vec<PluginInfo>, String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let mut plugins = Vec::new();

    if !plugin_dir.exists() {
        return Ok(plugins);
    }

    for entry in fs::read_dir(&plugin_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            let manifest_path = path.join("plugin.json");
            if manifest_path.exists() {
                match load_plugin_manifest(&path) {
                    Ok(manifest) => {
                        plugins.push(PluginInfo {
                            name: manifest.name,
                            version: manifest.version,
                            author: manifest.author,
                            description: manifest.description,
                            icon: manifest.icon,
                            homepage: manifest.homepage,
                            path: path.to_string_lossy().to_string(),
                            installed: true,
                            min_app_version: manifest.min_app_version,
                            outdated: None,
                            latest_version: None,
                            update_url: None,
                        });
                    }
                    Err(e) => {
                        log::warn!("Failed to load plugin manifest: {}", e);
                    }
                }
            }
        }
    }

    Ok(plugins)
}

/// 加载插件清单
fn load_plugin_manifest(plugin_path: &PathBuf) -> Result<PluginManifest, String> {
    let manifest_path = plugin_path.join("plugin.json");
    let content = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: PluginManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(manifest)
}

/// 获取插件详情
#[tauri::command]
pub fn get_plugin(app: tauri::AppHandle, name: String) -> Result<PluginManifest, String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let plugin_path = plugin_dir.join(&name).join("plugin.json");

    if !plugin_path.exists() {
        return Err("Plugin not found".to_string());
    }

    load_plugin_manifest(&plugin_dir.join(&name))
}

/// 检查插件兼容性
#[tauri::command]
pub fn check_plugin_compatibility(
    app: tauri::AppHandle,
    name: String,
) -> Result<serde_json::Value, String> {
    let manifest = get_plugin(app, name.clone())?;
    let app_version = get_app_version();

    let compatible = check_version_compatibility(&manifest.min_app_version, &app_version);

    Ok(serde_json::json!({
        "compatible": compatible,
        "plugin_version": manifest.version,
        "min_app_version": manifest.min_app_version,
        "app_version": app_version.string,
    }))
}

/// 版本比较
fn check_version_compatibility(min_version: &Option<String>, app_version: &AppVersion) -> bool {
    if let Some(min_ver) = min_version {
        let min = parse_version(min_ver);
        if let Some(min) = min {
            return compare_versions(&min, app_version) <= 0;
        }
    }
    true
}

/// 解析版本字符串
fn parse_version(version: &str) -> Option<AppVersion> {
    let version = version.trim_start_matches('v');
    let parts: Vec<&str> = version.split('.').collect();

    if parts.len() < 2 {
        return None;
    }

    let major: u32 = parts[0].parse().ok()?;
    let minor: u32 = parts[1].parse().ok()?;
    let patch: u32 = parts.get(2).unwrap_or(&"0").parse().unwrap_or(0);

    Some(AppVersion {
        major,
        minor,
        patch,
        string: format!("{}.{}.{}", major, minor, patch),
    })
}

/// 比较版本: 返回 -1 if v1 < v2, 0 if equal, 1 if v1 > v2
fn compare_versions(v1: &AppVersion, v2: &AppVersion) -> i32 {
    if v1.major != v2.major {
        return if v1.major > v2.major { 1 } else { -1 };
    }
    if v1.minor != v2.minor {
        return if v1.minor > v2.minor { 1 } else { -1 };
    }
    if v1.patch != v2.patch {
        return if v1.patch > v2.patch { 1 } else { -1 };
    }
    0
}

/// 获取应用版本
#[tauri::command]
pub fn get_app_version() -> AppVersion {
    // 从 tauri.conf.json 或代码中获取版本
    // 这里硬编码，实际应该从配置读取
    AppVersion {
        major: 1,
        minor: 0,
        patch: 0,
        string: "1.0.0".to_string(),
    }
}

/// 安装插件
#[tauri::command]
pub fn install_plugin(
    app: tauri::AppHandle,
    name: String,
    manifest: PluginManifest,
    files: Vec<(String, String)>,
) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let plugin_path = plugin_dir.join(&name);

    // 检查版本兼容性
    let app_version = get_app_version();
    if !check_version_compatibility(&manifest.min_app_version, &app_version) {
        return Err(format!(
            "Plugin requires app version >= {}, current is {}",
            manifest.min_app_version.unwrap_or_else(|| "1.0.0".to_string()),
            app_version.string
        ));
    }

    // 创建插件目录
    fs::create_dir_all(&plugin_path).map_err(|e| e.to_string())?;

    // 写入 plugin.json
    let manifest_path = plugin_path.join("plugin.json");
    let manifest_content = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    fs::write(&manifest_path, manifest_content).map_err(|e| e.to_string())?;

    // 写入其他文件
    for (filename, content) in files {
        let file_path = plugin_path.join(&filename);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&file_path, content).map_err(|e| e.to_string())?;
    }

    // 记录安装信息
    record_plugin_install(&app, &name, &manifest.version)?;

    Ok(())
}

/// 记录插件安装信息
fn record_plugin_install(app: &tauri::AppHandle, name: &str, version: &str) -> Result<(), String> {
    let storage_dir = get_storage_dir(app)?;
    let info_path = storage_dir.join("plugin_installs.json");

    let mut installs: serde_json::Value = if info_path.exists() {
        let content = fs::read_to_string(&info_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    installs[name] = serde_json::json!({
        "version": version,
        "installed_at": chrono_timestamp(),
    });

    let content = serde_json::to_string_pretty(&installs).map_err(|e| e.to_string())?;
    fs::write(&info_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取当前时间戳
fn chrono_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

/// 获取插件安装信息
#[tauri::command]
pub fn get_plugin_install_info(
    app: tauri::AppHandle,
    name: String,
) -> Result<serde_json::Value, String> {
    let storage_dir = get_storage_dir(app)?;
    let info_path = storage_dir.join("plugin_installs.json");

    if !info_path.exists() {
        return Ok(serde_json::json!({
            "version": null,
            "installed_at": null,
        }));
    }

    let content = fs::read_to_string(&info_path).map_err(|e| e.to_string())?;
    let installs: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(installs.get(&name).cloned().unwrap_or(serde_json::json!({
        "version": null,
        "installed_at": null,
    })))
}

/// 卸载插件
#[tauri::command]
pub fn uninstall_plugin(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let plugin_path = plugin_dir.join(&name);

    if plugin_path.exists() {
        fs::remove_dir_all(&plugin_path).map_err(|e| e.to_string())?;
    }

    // 移除安装记录
    remove_plugin_install_record(&app, &name)?;

    Ok(())
}

/// 移除插件安装记录
fn remove_plugin_install_record(app: &tauri::AppHandle, name: &str) -> Result<(), String> {
    let storage_dir = get_storage_dir(app)?;
    let info_path = storage_dir.join("plugin_installs.json");

    if info_path.exists() {
        let content = fs::read_to_string(&info_path).map_err(|e| e.to_string())?;
        let mut installs: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        if installs.get(name).is_some() {
            installs.as_object_mut().unwrap().remove(name);
            let new_content = serde_json::to_string_pretty(&installs).map_err(|e| e.to_string())?;
            fs::write(&info_path, new_content).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// 读取插件文件
#[tauri::command]
pub fn read_plugin_file(app: tauri::AppHandle, name: String, file_path: String) -> Result<String, String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let full_path = plugin_dir.join(&name).join(&file_path);

    if !full_path.exists() {
        return Err("File not found".to_string());
    }

    fs::read_to_string(&full_path).map_err(|e| e.to_string())
}

/// 写入插件文件
#[tauri::command]
pub fn write_plugin_file(
    app: tauri::AppHandle,
    name: String,
    file_path: String,
    content: String,
) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let full_path = plugin_dir.join(&name).join(&file_path);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&full_path, content).map_err(|e| e.to_string())
}

/// 删除插件文件
#[tauri::command]
pub fn delete_plugin_file(app: tauri::AppHandle, name: String, file_path: String) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&app)?;
    let full_path = plugin_dir.join(&name).join(&file_path);

    if full_path.exists() {
        fs::remove_file(&full_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 获取插件配置
#[tauri::command]
pub fn get_plugin_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let config_path = get_plugin_dir(&app).map_err(|e| e.to_string())?.join("config.json");

    if !config_path.exists() {
        return Ok(serde_json::json!({
            "enabled": []
        }));
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(config)
}

/// 保存插件配置
#[tauri::command]
pub fn save_plugin_config(app: tauri::AppHandle, config: serde_json::Value) -> Result<(), String> {
    let plugin_dir = get_plugin_dir(&app).map_err(|e| e.to_string())?;
    let config_path = plugin_dir.join("config.json");

    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 检查插件是否启用
#[tauri::command]
pub fn is_plugin_enabled(app: tauri::AppHandle, name: String) -> Result<bool, String> {
    let config = get_plugin_config(app)?;
    let enabled = config.get("enabled")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().any(|n| n.as_str() == Some(&name)))
        .unwrap_or(false);

    Ok(enabled)
}

/// 启用插件
#[tauri::command]
pub fn enable_plugin_cmd(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let config = get_plugin_config(app)?;
    let mut enabled = config.get("enabled")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if !enabled.iter().any(|n| n.as_str() == Some(&name)) {
        enabled.push(serde_json::Value::String(name.clone()));
    }

    let new_config = serde_json::json!({
        "enabled": enabled
    });

    save_plugin_config(app, new_config.clone())?;

    // 记录启用时间
    record_plugin_enable_time(&app, &name)?;

    Ok(())
}

/// 记录插件启用时间
fn record_plugin_enable_time(app: &tauri::AppHandle, name: &str) -> Result<(), String> {
    let storage_dir = get_storage_dir(app)?;
    let info_path = storage_dir.join("plugin_enables.json");

    let mut enables: serde_json::Value = if info_path.exists() {
        let content = fs::read_to_string(&info_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    enables[name] = serde_json::json!({
        "enabled_at": chrono_timestamp(),
    });

    let content = serde_json::to_string_pretty(&enables).map_err(|e| e.to_string())?;
    fs::write(&info_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 禁用插件
#[tauri::command]
pub fn disable_plugin_cmd(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let config = get_plugin_config(app)?;
    let enabled: Vec<serde_json::Value> = config.get("enabled")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter(|n| n.as_str() != Some(&name))
                .cloned()
                .collect()
        })
        .unwrap_or_default();

    let new_config = serde_json::json!({
        "enabled": enabled
    });

    save_plugin_config(app, new_config)
}

/// 获取所有启用的插件
#[tauri::command]
pub fn get_enabled_plugins(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let config = get_plugin_config(app)?;
    let enabled = config.get("enabled")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|n| n.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    Ok(enabled)
}

/// 获取插件目录
fn get_plugin_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let plugin_dir = app_data_dir.join("plugins");

    if !plugin_dir.exists() {
        fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;
    }

    Ok(plugin_dir)
}

/// 获取存储目录
fn get_storage_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let storage_dir = app_data_dir.join("storage");

    if !storage_dir.exists() {
        fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;
    }

    Ok(storage_dir)
}