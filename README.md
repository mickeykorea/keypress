# Keypress

![GitHub release](https://img.shields.io/github/v/release/mickeykorea/keypress)
![License](https://img.shields.io/github/license/mickeykorea/keypress)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

A keystroke visualizer for macOS. Shows what you're typing as a floating overlay on screen. Built for screen recordings, live demos, and tutorials, where viewers need to see what keys are being pressed.

<!-- hero screenshot or GIF here -->
<!-- ![Keypress Demo](assets/demo.gif) -->

</br>

## Features

- **Real-time keystroke overlay** styled after the Apple Magic Keyboard
- **Modifier symbols** ⌘ ⌥ ⇧ ⌃ with proper Apple iconography
- **Light / Dark / Auto / Custom themes** follows your system appearance or let you pick your own colors
- **Stack & Single display modes** to show keystroke history or just the latest key
- **6 preset positions + drag-to-reposition** so you can place the overlay wherever you want
- **Multi-monitor support** choose which display to show the overlay on
- **Adjustable size, opacity, and duration** to tweak it until it feels right
- **Global toggle** ⌥⌘K to show/hide from any app
- **Intuitive settings UI** with only the essentials, no BS

<!-- Screenshot of the settings window -->
<!-- ![Settings](assets/settings.png) -->

</br>

## Installation

You can download the latest version of Keypress from the **[Release](https://github.com/mickeykorea/keypress/releases)** page.

- **macOS:** Download the `.dmg`.
  Keypress requires **Accessibility** permission to capture keystrokes. On first launch, grant access in:
  `System Settings > Privacy & Security > Accessibility`

</br>

## Contribution

If you want to contribute or build from source, make sure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mickeykorea/keypress.git
    cd keypress
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Build the `.dmg`:**
    ```bash
    npm run make
    ```

</br>

## Feedback

- **Email:** mickey@protopie.io
- **Star the Repo:** It helps others discover the app.

</br>

## License

[GPL-3.0](https://opensource.org/licenses/GPL-3.0)

Keypress is free and open source. Displaying keystrokes isn't rocket science, nor should it cost you any money.
