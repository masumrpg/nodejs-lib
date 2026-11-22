import type { PlopTypes } from "@turbo/gen";

type LibraryType =
  | "react-native-ui"
  | "react-native-core"
  | "react-web"
  | "node-lib"
  | "cli";

function buildPackageActions(
  answers: PlopTypes.Answers | undefined,
  fixedType?: LibraryType
): PlopTypes.ActionType[] {
  const type: LibraryType = fixedType || (answers?.type as LibraryType) || "node-lib";
  const description = answers?.description || "";

  const isRNUI = type === "react-native-ui";
  const isRNCore = type === "react-native-core";
  const isReactWeb = type === "react-web";
  const isNodeLib = type === "node-lib";
  const isCLI = type === "cli";
  const hasUI = isRNUI || isReactWeb;
  const hasPeerDeps = isRNCore || isReactWeb;
  const jsxMode =
    isRNUI || isRNCore
      ? "react-native"
      : isReactWeb
        ? "react-jsx"
        : undefined;

  const data = {
    ...answers,
    type,
    isRNUI,
    isRNCore,
    isReactWeb,
    isNodeLib,
    isCLI,
    hasUI,
    hasPeerDeps,
    jsxMode,
    description,
  };

  const actions: PlopTypes.ActionType[] = [];

  // 1. package.json
  if (isRNUI) {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/package.json",
      templateFile: "templates/package.rn-ui.json.hbs",
      data,
    });
  } else {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/package.json",
      templateFile: "templates/package.tsup.json.hbs",
      data,
    });
  }

  // 2. tsconfig.json
  actions.push({
    type: "add",
    path: "packages/{{kebabCase name}}/tsconfig.json",
    templateFile: "templates/tsconfig.json.hbs",
    data,
  });

  // 3. Build & Bundler Configs (tsup for non-bob packages)
  if (!isRNUI) {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/tsconfig.build.json",
      templateFile: "templates/tsconfig.build.json.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/tsup.config.ts",
      templateFile: "templates/tsup.config.ts.hbs",
      data,
    });
  }

  // 4. Source Files based on Archetype
  if (isRNUI) {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/{{pascalCase name}}.tsx",
      templateFile: "templates/component.rn.tsx.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/index.tsx",
      templateFile: "templates/index.ts.hbs",
      data,
    });
  } else if (isReactWeb) {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/{{pascalCase name}}.tsx",
      templateFile: "templates/component.web.tsx.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/index.tsx",
      templateFile: "templates/index.ts.hbs",
      data,
    });
  } else if (isCLI) {
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/{{camelCase name}}.ts",
      templateFile: "templates/utility.ts.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/index.ts",
      templateFile: "templates/index.ts.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/cli.ts",
      templateFile: "templates/cli.ts.hbs",
      data,
    });
  } else {
    // isRNCore or isNodeLib
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/{{camelCase name}}.ts",
      templateFile: "templates/utility.ts.hbs",
      data,
    });
    actions.push({
      type: "add",
      path: "packages/{{kebabCase name}}/src/index.ts",
      templateFile: "templates/index.ts.hbs",
      data,
    });
  }

  // 5. Documentation & License
  actions.push({
    type: "add",
    path: "packages/{{kebabCase name}}/README.md",
    templateFile: "templates/README.md.hbs",
    data,
  });
  actions.push({
    type: "add",
    path: "packages/{{kebabCase name}}/LICENSE",
    templateFile: "templates/LICENSE.hbs",
    data,
  });

  // 6. Monorepo Playground / Wiring
  if (isRNUI || isRNCore) {
    actions.push(
      {
        type: "modify",
        path: "apps/expo-go/package.json",
        pattern: /("dependencies":\s*\{[\s\S]*?)(\n\s*\})/,
        template: '$1,\n    "@masumdev/{{kebabCase name}}": "workspace:*"$2',
      },
      {
        type: "modify",
        path: "apps/expo-go/tsconfig.json",
        pattern: /("paths":\s*\{[\s\S]*?)(\n\s*\})/,
        template:
          '$1,\n      "@masumdev/{{kebabCase name}}": ["../../packages/{{kebabCase name}}/src"]$2',
      }
    );
  } else if (isCLI) {
    actions.push({
      type: "add",
      path: "apps/cli/{{kebabCase name}}/package.json",
      template: JSON.stringify(
        {
          name: "{{kebabCase name}}-playground",
          version: "1.0.0",
          private: true,
          type: "module",
          scripts: {
            run: "bun ../../../packages/{{kebabCase name}}/dist/cli.mjs",
          },
          dependencies: {
            "@masumdev/{{kebabCase name}}": "workspace:*",
          },
          devDependencies: {
            typescript: "^5.7.3",
          },
        },
        null,
        2
      ),
      data,
    });
  }

  return actions;
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Unified Flexible Package Generator
  plop.setGenerator("package", {
    description: "Generate a flexible monorepo package (RN UI, RN Core, Web, Node Lib, CLI)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the new package (kebab-case)?",
        validate: (input: string) => {
          if (!input) return "Package name is required";
          if (input.includes(" ")) return "Package name cannot contain spaces";
          return true;
        },
      },
      {
        type: "list",
        name: "type",
        message: "Select package archetype / target:",
        choices: [
          {
            name: "React Native UI Kit (bob bundler + JSX + auto-link to apps/expo-go)",
            value: "react-native-ui",
          },
          {
            name: "React Native Core / Hooks (tsup bundler + headless + auto-link to apps/expo-go)",
            value: "react-native-core",
          },
          {
            name: "React Web UI Library (tsup bundler + web JSX)",
            value: "react-web",
          },
          {
            name: "Universal Node.js / TypeScript Library (tsup bundler + zero UI deps)",
            value: "node-lib",
          },
          {
            name: "CLI Developer Tool (tsup bundler + bin entry + apps/cli playground)",
            value: "cli",
          },
        ],
        default: "react-native-ui",
      },
      {
        type: "input",
        name: "description",
        message: "Package description (optional):",
      },
    ],
    actions: (answers) => buildPackageActions(answers),
  });

  // Backward-compatible shortcut: Expo package
  plop.setGenerator("expo-package", {
    description: "Generate new React Native & Expo UI package (bob + apps/expo-go)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the new Expo package?",
        validate: (input: string) => {
          if (!input) return "Package name is required";
          if (input.includes(" ")) return "Package name cannot contain spaces";
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "Package description (optional):",
      },
    ],
    actions: (answers) => buildPackageActions(answers, "react-native-ui"),
  });

  // Backward-compatible shortcut: CLI package
  plop.setGenerator("cli-package", {
    description: "Generate new Node.js CLI tool with playground in apps/cli",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the new CLI package?",
        validate: (input: string) => {
          if (!input) return "Package name is required";
          if (input.includes(" ")) return "Package name cannot contain spaces";
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "Package description (optional):",
      },
    ],
    actions: (answers) => buildPackageActions(answers, "cli"),
  });
}
