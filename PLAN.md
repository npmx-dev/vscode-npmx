# 版本控制文件解析重构

> [!TIP]
>
> 先不要改现有功能的逻辑，先实现整体流程

核心为：提供一个方法，当打开包管理相关的其中一个文件时调用，解析整个项目（workspaceFolder）的依赖关系

整体流程：

1. 打开某个包管理相关文件触发
2. 以 workspaceFolder 为边界解析根 package.json
3. 检测 package manager
4. 解析当前 workspace dependencies
5. 生成 PackageContext

## workspace

需要解析得到 WorkspaceContext 并根据 workspace 的 path 做缓存:

全局存一个 `Map<string, WorkspaceContext>`

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

## 依赖

整体流程：

1. spec -> resolvedSpec -> packageInfo -> resolvedVersion

```ts
interface ResolvedDependencyInfo {
  category: | 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies' | 'catalog' | 'catalogs'

  rawName: string // 文件中原始依赖名
  rawSpec: string // 文件中原始依赖版本 '^1', '*' 等

  nameNode: ValidNode // 文件中依赖名的节点
  specNode: ValidNode // 文件中依赖版本的节点

  protocol: 'npm' | 'jsr' | 'workspace' | 'catalog' | 'file' | 'git' | 'http' // 参考 parseVersion，有些 protocol 是不支持的，可以直接不解析该依赖
  catalogName?: string // 命名 catalog 用，例如 catalogs.dev
  resolvedName: string // 经过解析后的依赖名, 版本中指定 'npm:@jsr/a_b' 得到 '@a/b', 'npm:nuxt@latest' -> 'nuxt'
  resolvedSpec: string // 经过解析后的依赖版本, 'catalog:dev' -> 对应包管理器文件中的指定信息, 'npm:nuxt@latest' -> 'latest'
  resolvedVersion: () => Promise<string | null> // lazy init 方法, 通过解析 spec 和 packageInfo 得到的一个实际安装版本 'npm:nuxt@latest' -> '4.3.1'
  packageInfo: () => Promise<PackageInfo | null> // lazy init 通过 getPackageInfo api 得到的结果，底层已经做了缓存、并发处理
}
```

举例： `"my-nuxt": "npm:nuxt@latest"` ->
```
{
  rawName: "my-nuxt",
  rawSpec: "npm:nuxt@latest",
  nameNode,
  specNode,
  protocol: "npm",
  name: "nuxt",
  spec: "latest",
  version: "4.3.1",
  engines,
  packageInfo,
}
```
