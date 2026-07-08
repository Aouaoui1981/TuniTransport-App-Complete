# Contributing to TuniTransport

Thank you for your interest in contributing to TuniTransport! This document provides guidelines and best practices to help you get started with contributing to our React Native and Expo application.

## 1. Getting Started

To start contributing, follow these steps:

1.  **Fork the repository** (if you are an external contributor).
2.  **Clone your fork**:
    ```bash
    git clone https://github.com/your-username/TuniTransport-App-Complete.git
    cd TuniTransport-App-Complete
    ```
3.  **Install dependencies**:
    ```bash
    cd TuniTransport
    npm install
    npx expo install --fix
    ```
4.  **Run the application**:
    ```bash
    npx expo start
    ```

## 2. Branching Strategy

We follow a simple branching strategy. All new features and bug fixes should be developed in their own branches.

-   **Main Branch**: `main` is the stable branch. It should always be in a deployable state.
-   **Feature Branches**: Use descriptive names starting with `feature/`, `bugfix/`, or `docs/`.
    -   Example: `feature/user-profile-enhancement`, `bugfix/fix-login-error`, `docs/update-contributing-guide`.

### How to branch out from `main`:

1.  Ensure you are on the `main` branch and it's up to date:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  Create and switch to your new branch:
    ```bash
    git checkout -b feature/your-feature-name
    ```

## 3. Code Style Guidelines (React Native & Expo)

To maintain a consistent codebase, please adhere to the following style tips:

-   **TypeScript**: Use TypeScript for all new code. Define interfaces and types for props, state, and API responses.
-   **Component Structure**:
    -   Use functional components with hooks.
    -   Keep components small and focused.
    -   Export components as the default export from their respective files.
-   **Styling**:
    -   Use `StyleSheet.create` for styling.
    -   Prefer constants from `src/utils/theme.ts` for colors, spacing, and typography to maintain consistency.
-   **Naming Conventions**:
    -   Components: `PascalCase` (e.g., `StatusBadge.tsx`)
    -   Functions and Variables: `camelCase` (e.g., `fetchShipments`)
    -   Constants: `UPPER_SNAKE_CASE` (e.g., `PLATFORM_FEE_PERCENT`)
-   **Directory Structure**: Follow the existing project structure (e.g., components in `src/components`, screens in `src/screens`, services in `src/services`).

## 4. Pull Request Process

1.  **Verify your changes**: Run the app and ensure your changes work as expected and don't break existing functionality.
2.  **Commit your changes**: Write clear and concise commit messages.
    ```bash
    git add .
    git commit -m "feat: add user profile enhancement"
    ```
3.  **Push to your branch**:
    ```bash
    git push origin feature/your-feature-name
    ```
4.  **Open a Pull Request (PR)**:
    -   Provide a clear title and description of the changes.
    -   Reference any related issues (e.g., `Closes #123`).
    -   Wait for review and address any feedback.

## 5. Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub. Provide as much detail as possible, including:
-   Steps to reproduce (for bugs).
-   Expected vs. actual behavior.
-   Screenshots or videos if applicable.

---
Thank you for helping make TuniTransport better!
