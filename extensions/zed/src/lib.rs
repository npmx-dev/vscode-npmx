use zed_extension_api::{self as zed, serde_json, settings::LspSettings, LanguageServerId};

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
            let command = binary
                .path
                .unwrap_or_else(|| zed::node_binary_path().unwrap_or_else(|_| String::from("node")));
            let args = binary.arguments.unwrap_or_default();
            let env = binary.env.unwrap_or_default().into_iter().collect();

            return Ok(zed::Command { command, args, env });
        }

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![Self::default_server_script(), String::from("--stdio")],
            env: worktree.shell_env().into_iter().collect(),
        })
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
