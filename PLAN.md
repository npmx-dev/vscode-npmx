# 版本控制文件解析重构

> [!TIP]
>
> 当前文档描述的是已经落地的依赖解析基础层结构

核心为：当打开或切换到包管理相关文件时，以 `workspaceFolder` 为边界构建并缓存统一的 workspace 依赖上下文；相关文件变更后整仓失效，并在下次访问时重建。

整体流程：

1. 打开或切换到某个包管理相关文件时触发预热
2. 以 workspaceFolder 为边界解析根 package.json
3. 检测 package manager
4. 扫描整个 workspace 中的 `package.json`
5. 解析 workspace 根部的 `pnpm-workspace.yaml` / `.yarnrc.yml` catalogs
6. 为每个受支持文档生成 resolved dependencies
7. 缓存 `WorkspaceContext`，并按文档提供依赖查询

受支持文件：

- `package.json`
- `pnpm-workspace.yaml`
- `.yarnrc.yml`

## workspace

对外暴露的 workspace 数据结构：

``` ts
interface WorkspaceContext {
  packageManager: 'npm' | 'pnpm' | 'yarn'
  catalogs?: Record<string, Record<string, string>>
  packages: Map<string, PackageContext> // key 是 packageJsonPath
}
```

``` ts
interface PackageContext {
  workspaceContext: WorkspaceContext
  packageJsonPath: string
  engines?: PackageInfo['engines'] // package.json 中 的 engines
  dependencies: Map<string, ResolvedDependencyInfo> // 当前文件中的所有依赖
}
```

上下文服务按 workspace path 做缓存，并提供这些方法：

```ts
getWorkspaceContext(uri: Uri): Promise<WorkspaceContext | undefined>
getPackageContext(uri: Uri): Promise<PackageContext | undefined>
getResolvedDependencies(uri: Uri): Promise<ResolvedDependencyInfo[]>
getResolvedDependencyByOffset(uri: Uri, offset: number): Promise<ResolvedDependencyInfo | undefined>
warmWorkspaceContext(uri: Uri): Promise<void>
invalidateWorkspaceContext(workspacePath: string): void
```

其中：

- `WorkspaceContext` 表示整仓级别的 package manager、catalogs 和 packages。
- `PackageContext` 表示某个 package.json 对应的 package 级上下文。
- 文档级依赖查询同时覆盖 `package.json`、`pnpm-workspace.yaml`、`.yarnrc.yml`。
- 已打开文档优先使用内存文本，未打开文件回退磁盘内容。
- 相关文件创建、修改、删除或关闭后，会触发 workspace cache 失效。

## 依赖

整体流程：

1. spec -> resolvedSpec -> packageInfo -> resolvedVersion

Extractor 直接返回 range-only 的 `DependencyInfo`，不再向上暴露 AST node：

```ts
interface DependencyInfo {
  category: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies' | 'catalog' | 'catalogs'

  rawName: string // 文件中原始依赖名
  rawSpec: string // 文件中原始依赖版本 '^1', '*' 等

  nameRange: [start: number, end: number] // 半开区间 [start, end)
  specRange: [start: number, end: number] // 半开区间 [start, end)

  categoryName?: string // 命名 catalog 用，例如 catalogs.dev
}
```

```ts
interface ResolvedDependencyInfo extends DependencyInfo {
  protocol: 'npm' | 'jsr' | 'workspace' | 'catalog' | 'file' | 'git' | 'http' // 参考 parseVersion，有些 protocol 是不支持的，可以直接不解析该依赖
  resolvedName: string // 经过解析后的依赖名, 版本中指定 'npm:@jsr/a_b' 得到 '@a/b', 'npm:nuxt@latest' -> 'nuxt'
  resolvedSpec: string // 经过解析后的依赖版本, 'catalog:dev' -> 对应包管理器文件中的指定信息, 'npm:nuxt@latest' -> 'latest'
  resolvedVersion: () => Promise<string | null> // lazy init 方法, 通过解析 spec 和 packageInfo 得到的一个实际安装版本 'npm:nuxt@latest' -> '4.3.1'
  packageInfo: () => Promise<PackageInfo | null> // lazy init 通过 getPackageInfo api 得到的结果，底层已经做了缓存、并发处理
}
```

消费层统一通过 `workspace-context` 获取依赖信息。hover、completion、document link、diagnostics 都不再直接读取 extractor AST，而是消费 `ResolvedDependencyInfo` 与其 range。

举例： `"my-nuxt": "npm:nuxt@latest"` ->
```
{
  rawName: "my-nuxt",
  rawSpec: "npm:nuxt@latest",
  nameRange: [20, 27],
  specRange: [31, 47],
  protocol: "npm",
  resolvedName: "nuxt",
  resolvedSpec: "latest",
  category: "dependencies",
  categoryName: undefined,
  resolvedVersion: async () => "4.3.1",
  packageInfo,
}
```
