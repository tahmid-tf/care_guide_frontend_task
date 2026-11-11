# Secure Note-Taking Application — Frontend Client

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6%2B-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-Modern%20Design%20System-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic%20Markup-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Architecture](https://img.shields.io/badge/Architecture-Single%20Page%20Application%20(SPA)-purple.svg)](#features--architecture)

A responsive, lightweight Single-Page Application (SPA) designed to interface with the Secure Note-Taking REST API. Built entirely with vanilla JavaScript, modern semantic HTML5, and responsive CSS variables without external framework dependencies, providing blazing-fast load times and straightforward maintainability.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features](#key-features)
  - [Authentication & Role-Based Access Control (RBAC)](#authentication--role-based-access-control-rbac)
  - [Personal & Global Notes Management](#personal--global-notes-management)
  - [Admin User Management](#admin-user-management)
  - [Interactive MongoDB Aggregation Demonstrators](#interactive-mongodb-aggregation-demonstrators)
  - [Public Community Posts](#public-community-posts)
- [File Structure](#file-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Startup](#installation--startup)
  - [Configuration](#configuration)
- [API Integration Overview](#api-integration-overview)
- [UI & Design System](#ui--design-system)

---

## Overview & Architecture

The frontend application serves as the user-facing interface for the Secure Note-Taking and Aggregation system. It demonstrates secure JWT authentication handling, reactive Role-Based Access Control (RBAC) UI tailoring, complete CRUD note operations, admin controls, and interactive MongoDB aggregation pipeline visualizations.

### Architectural Highlights

- **Zero-Dependency Architecture:** No heavy third-party UI libraries or client frameworks (no React, Vue, or Bootstrap overhead). Native DOM operations ensure minimal bundle size and immediate execution.
- **Built-in Static Web Server:** Includes a lightweight, zero-dependency Node.js HTTP server (`server.js`) that handles static asset serving and proper MIME type routing.
- **Centralized State & API Management:** State is tracked in a clean JavaScript controller object (`state`), paired with a centralized `apiFetch` wrapper supporting automated Authorization headers and automatic session expiry/logout handling.
- **Role-Aware UI:** Elements such as the Admin Panel tab and global note inspection toggles dynamically adapt based on the authenticated user's role (`admin` vs. `user`).

---

## Key Features

### Authentication & Role-Based Access Control (RBAC)

- **Registration & Login:**
  - Create new accounts with customizable user roles (`user` or `admin`) and comma-separated interests.
  - Sign in with standard email and password authentication.
  - **Quick Demo Fill Buttons:** Instant 1-click credentials autofill for Demo Admin (`admin@example.com`) and Demo User (`alice@example.com`).
- **Session Management:**
  - Secure token persistence in browser `localStorage`.
  - Automatic authentication state verification (`GET /api/auth/me`) on page load.
  - One-click logout that securely wipes local tokens and resets state.
- **Dynamic Role Badge & Profile Header:**
  - Displays username, assigned role badge (`Admin` or `User`), and current user interest tags directly in the application header.

### Personal & Global Notes Management

- **Notes CRUD Operations:**
  - **Create:** Add new notes with title and markdown/plain text content.
  - **Read:** Paginated note card feed showing creation timestamps and author details.
  - **Update:** Inline editing mode with form pre-fill and cancel options.
  - **Delete:** Instant note removal with real-time list refreshing.
- **Admin Privilege Toggle:**
  - When logged in as an administrator, an exclusive **"View Everyone's Notes"** toggle allows inspecting notes across all registered accounts.

### Admin User Management

- **User Administration Dashboard:** Accessible strictly to users with the `admin` role.
- **User Provisioning:** Direct user creation form specifying username, email, initial password, assigned role, and interests.
- **Paginated User Directory:** Interactive table displaying registered users with:
  - Username and Email
  - Assigned Role Badge
  - Tags for User Interests
  - Registration Timestamp
  - Safe user deletion action

### Interactive MongoDB Aggregation Demonstrators

Dedicated UI cards allowing administrators and users to execute and visualize the output of complex backend MongoDB aggregation pipelines:

1. **Scenario 1: Group Users by Interests (`$unwind`, `$group`, `$sort`)**
   - Triggers the backend aggregation pipeline backed by multikey indexing (`interests: 1`).
   - Renders a clean breakdown of each interest category, the total count of interested users, and user tag badges.
2. **Scenario 2: Retrieve User Posts with `$lookup`**
   - Dynamic user selection dropdown populated from active users.
   - Executes single-pipeline `$lookup` query joining User profiles with their public posts.
   - Formats matched post author metadata and associated post histories.

### Public Community Posts

- Dedicated feed allowing users to publish posts visible to all members.
- Paginated cards displaying post title, content, author username, and publication date.

---

## File Structure

```
frontend/
├── index.html        # Semantic HTML5 single-page application structure & layout
├── style.css         # Modern, responsive CSS design system with CSS custom properties
├── app.js            # Frontend application controller, state store & API client
├── server.js         # Zero-dependency Node.js HTTP static server
├── package.json      # Project metadata and npm start script
└── README.md         # Comprehensive frontend documentation
```

### Component Details

- **`index.html`**: Contains structured sections for Authentication, Top Navigation Header, Alert Banners, and Tabbed Views (Notes, Admin Panel, Aggregation Tasks, Public Posts).
- **`style.css`**: Provides responsive grid layouts, card designs, accessible typography, modal/alert styling, and state classes without external dependencies.
- **`app.js`**: Drives client-side reactivity, tab switching, form validation, asynchronous HTTP calls via `fetch`, and DOM rendering.
- **`server.js`**: Implements a native Node.js HTTP server listening on port `3000` (or `process.env.PORT`) with full MIME type resolution.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16.x, 18.x, 20.x, or newer)
- Running instance of the **Backend REST API** (typically listening on `http://localhost:5000`)

### Installation & Startup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Start the static web server:**
   ```bash
   npm start
   ```
   *(Alternatively, run directly via Node: `node server.js`)*

3. **Open the application:**
   Visit [`http://localhost:3000`](http://localhost:3000) in your web browser.

### Configuration

- **API Base URL:**
  By default, API requests are routed to `http://localhost:5000/api`. To adjust the backend target, update the `API_BASE` constant in [app.js](file:///app.js#L7):
  ```javascript
  const API_BASE = 'http://localhost:5000/api';
  ```

- **Static Server Port:**
  The frontend server defaults to port `3000`. You can specify a custom port via the `PORT` environment variable:
  ```bash
  PORT=8080 npm start
  ```

---

## API Integration Overview

The frontend interacts with the following backend endpoints:

| Endpoint | Method | Role Required | Description |
| :--- | :---: | :---: | :--- |
| `/auth/register` | `POST` | Public | Register a new user account |
| `/auth/login` | `POST` | Public | Authenticate user & receive JWT token |
| `/auth/me` | `GET` | Authenticated | Retrieve current user profile and role |
| `/notes` | `GET` | Authenticated | Paginated user notes (or all notes for admin) |
| `/notes` | `POST` | Authenticated | Create a new note |
| `/notes/:id` | `PUT` | Authenticated | Update an existing note |
| `/notes/:id` | `DELETE` | Authenticated | Delete a note |
| `/users` | `GET` | Admin | List all registered users (paginated) |
| `/users` | `POST` | Admin | Create a new user with designated role |
| `/users/:id` | `DELETE` | Admin | Remove a user from the system |
| `/aggregations/users-by-interests` | `GET` | Authenticated | Scenario 1: Group users by interests |
| `/aggregations/user-posts/:userId` | `GET` | Authenticated | Scenario 2: Retrieve user posts via `$lookup` |
| `/posts` | `GET` | Authenticated | Retrieve community posts (paginated) |
| `/posts` | `POST` | Authenticated | Publish a new public community post |

---

## UI & Design System

- **Clean Aesthetic:** Modern color palette based on Tailwind-inspired slate and indigo tones.
- **Responsive Layout:** Adaptive multi-column grids for desktops, tablets, and mobile viewports.
- **Accessible Feedback:** Dynamic floating alerts with color indicators for success (green), info (blue), warning (amber), and error (red) events.
- **Fast Pagination:** Compact, intuitive pagination controls across notes, registered users, and posts.
