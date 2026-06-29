use zed_extension_api::{self as zed, LanguageServerId, serde_json, settings::LspSettings};

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

    fn default_server_script() -> String {
        format!(
            "{}/../../packages/language-server/dist/index.cjs",
            env!("CARGO_MANIFEST_DIR")
        )
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
        if let Some(binary) = lsp_settings.binary {
            let command = match binary.path {
                Some(path) => path,
                None => zed::node_binary_path()?,
            };
            let args = binary.arguments.unwrap_or_default();
            let env = worktree
                .shell_env()
                .into_iter()
                .chain(binary.env.unwrap_or_default())
                .collect();

            return Ok(zed::Command { command, args, env });
        }

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![Self::default_server_script(), String::from("--stdio")],
            env: worktree.shell_env().into_iter().collect(),
        })
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
