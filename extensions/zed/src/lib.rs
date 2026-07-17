use zed_extension_api::{self as zed, LanguageServerId, Result, serde_json, settings::LspSettings};

const PACKAGE_NAME: &str = "npmx-language-server";

struct NpmxExtension;

impl NpmxExtension {
    fn language_server_settings(
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> LspSettings {
        LspSettings::for_worktree(language_server_id.as_ref(), worktree)
            .ok()
            .unwrap_or_default()
    }

    fn server_binary(worktree: &zed::Worktree, lsp_settings: &LspSettings) -> Result<zed::Command> {
        let mut env: Vec<(String, String)> = worktree.shell_env().into_iter().collect();

        if let Some(binary) = &lsp_settings.binary {
            if let Some(binary_env) = &binary.env {
                env.extend(binary_env.clone());
            }

            if binary.path.is_some() || binary.arguments.is_some() {
                let command = match &binary.path {
                    Some(path) => path.clone(),
                    None => zed::node_binary_path()?,
                };
                let args = binary.arguments.clone().unwrap_or_default();
                return Ok(zed::Command { command, args, env });
            }
        }

        let version = env!("CARGO_PKG_VERSION");

        let installed = zed::npm_package_installed_version(PACKAGE_NAME)?;
        if installed.as_deref() != Some(version) {
            zed::npm_install_package(PACKAGE_NAME, version)?;
        }

        let node = zed::node_binary_path()?;
        Ok(zed::Command {
            command: node,
            args: vec![
                format!("node_modules/{PACKAGE_NAME}/dist/index.cjs"),
                "--stdio".to_string(),
            ],
            env,
        })
    }
}

impl zed::Extension for NpmxExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        let lsp_settings = Self::language_server_settings(language_server_id, worktree);
        Self::server_binary(worktree, &lsp_settings)
    }

    fn language_server_initialization_options(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<Option<serde_json::Value>> {
        let settings = Self::language_server_settings(language_server_id, worktree);
        let workspace_settings = settings.settings.unwrap_or_default();
        let client_features =
            workspace_settings
                .get("clientFeatures")
                .cloned()
                .unwrap_or(serde_json::json!({
                    "catalogInlayHints": true,
                    "iconStyle": "emoji",
                }));

        Ok(Some(serde_json::json!({
            "npmx": {
                "clientFeatures": client_features
            }
        })))
    }

    fn language_server_workspace_configuration(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<Option<serde_json::Value>> {
        let settings = Self::language_server_settings(language_server_id, worktree);
        let workspace_settings = settings.settings.unwrap_or_default();

        Ok(Some(serde_json::json!({
            "npmx": workspace_settings
        })))
    }
}

zed::register_extension!(NpmxExtension);
