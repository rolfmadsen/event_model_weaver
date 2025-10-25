# Event Model Weaver - P2P Edition

Event Model Weaver is a modern, real-time, collaborative tool for practicing Event Modeling. It provides a visual, intelligent canvas to design and document business processes using a structured, event-centric approach.

This version is built on a serverless, peer-to-peer architecture using **GUN.js**, allowing for seamless real-time collaboration without any backend infrastructure. Every model gets a unique, shareable URL, and all changes are instantly synchronized between connected users.

![Event Model Weaver Screenshot](https://i.imgur.com/gY5a2Qc.png)

## What is Event Modeling?
Event Modeling is a method of describing a system by illustrating the information that changes within it over time. It focuses on a single, comprehensive diagram that captures commands, events, views, and their relationships, providing a clear and complete blueprint for development.

## Key Features

- **Intelligent Canvas**: The canvas understands the rules of Event Modeling. It provides real-time visual feedback, highlighting valid and invalid connections as you model, guiding you toward a correct design.
- **Visual P2P Collaboration**: Share a link with your team and watch updates happen live. No central server, no accounts needed.
- **Core Event Model Elements**: Add and connect essential components: Triggers, Commands, Aggregates, Events, Policies, and Views.
- **Stereotypes for Triggers**: Classify Triggers as user-driven (`Actor`), system-driven (`System`), or automated (`Automation`) for clearer models.
- **Import & Export**: Save your model to a local JSON file for backup or sharing, and import it back into any session.
- **Serverless by Design**: The entire application runs in the browser. Data is synchronized directly between peers.
- **Intuitive Interface**: Drag-and-drop nodes, create links easily, and edit properties in a dedicated panel.
- **Unique & Shareable Models**: Each new session creates a unique URL that serves as the collaboration space for that model.

## How to Use

1.  **Open the Application**: Simply navigate to the application's URL.
2.  **Get Your Unique Link**: The app will automatically generate a unique ID in the URL hash (`#your-unique-id`). This is your collaborative workspace.
3.  **Add Elements**: Use the floating `+` button in the bottom-right corner to add elements like `Trigger`, `Command`, or `Event` to the canvas.
4.  **Arrange the Canvas**:
    -   Click and drag elements to position them. The canvas uses a grid for easy alignment.
    -   Pan by clicking and dragging the canvas background.
    -   Zoom using your mouse wheel.
5.  **Create Relationships**:
    -   Hover over an element to reveal four connection handles.
    -   Click and drag from a handle to another element. The canvas will give you instant feedback: potential targets will glow **green** if the connection is valid according to Event Modeling rules, and **red** if it is not. Invalid links cannot be created.
6.  **Edit Properties**:
    -   **Single-click** an element or a link to select it and open the **Properties Panel** on the right. Here you can edit its name, description, and (for Triggers) its stereotype.
    -   **Double-click** an element or link to focus the input field in the panel for quick editing.
7.  **Collaborate**:
    -   Click the **Share** button at the top to copy the unique URL to your clipboard.
    -   Send this link to your colleagues. Any changes they make will appear on your screen in real-time, and vice-versa.
8.  **Save and Load**:
    -   Use the **Export** button to download the entire model as a `.json` file.
    -   Use the **Import** button to load a model from a `.json` file, replacing the current content of your canvas.

## Running Locally

This is a static web application with no build step required.

1.  Clone the repository.
2.  Serve the project files using any local static file server. For example:
    -   **Using `npx` (Node.js)**:
        ```bash
        npx serve .
        ```
    -   **Using Python**:
        ```bash
        python3 -m http.server
        ```
3.  Open your browser and navigate to the local URL provided by the server.

## Tech Stack

-   **React**: For building the user interface.
-   **D3.js**: For rendering and managing the interactive graph canvas.
-   **GUN.js**: For the decentralized, real-time, peer-to-peer database.
-   **TypeScript**: For type-safe JavaScript.
-   **Tailwind CSS**: For utility-first styling.
