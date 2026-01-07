# 📚 StudyBuddy 2.0

<p align="center">
  <strong>Your ultimate companion for efficient and effective studying</strong>
</p>

<p align="center">
  <a href="https://studybuddy2-seven.vercel.app">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Features

### Google Classroom Integration
Track your grades, course enrollment, and assignments all in one place. Automatically syncs with your Google Classroom to keep you up to date.

### AI-Powered Study Assistance
Get help with project planning, homework completion, and everyday questions using our integrated AI assistant powered by Google Gemini.

### Automated Homework Reports
Never miss an assignment! Receive a beautifully formatted email at **2:00 PM ET** every day with your upcoming assignments and completion status.

### Smart Reminders
Get a gentle nudge at **6:30 PM ET** if you have unsubmitted homework due tomorrow. No more forgetting to click that turn-in button!

### Peer Chat Rooms
Collaborate with classmates through dedicated chat rooms for studying, project planning, and homework discussions.

---

## Getting Started

### For Students (Using StudyBuddy)

Just visit **[studybuddy2-seven.vercel.app](https://studybuddy2-seven.vercel.app)** and sign in with your Google account! No setup required.

### For Developers (Running Locally)

<details>
<summary>Click to expand development setup instructions</summary>

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Firebase](https://firebase.google.com/) project
- A [Google Cloud](https://cloud.google.com/) project with Classroom API enabled
- A [Google Gemini API](https://ai.google.dev/) key

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/StudyBuddy2.git
   cd StudyBuddy2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Google OAuth
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key

   # Email (for automated reports)
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=your_app_password

   # Cron Job Security
   CRON_SECRET=your_random_secret_string
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

</details>

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 14](https://nextjs.org/) |
| **Frontend** | [React 18](https://reactjs.org/), [React Bootstrap](https://react-bootstrap.github.io/) |
| **Styling** | [Bootstrap 5](https://getbootstrap.com/), CSS Modules |
| **Backend** | Next.js API Routes |
| **Database** | [Firebase Firestore](https://firebase.google.com/docs/firestore) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/docs/auth), Google OAuth 2.0 |
| **AI** | [Google Gemini](https://ai.google.dev/) |
| **APIs** | [Google Classroom API](https://developers.google.com/classroom) |
| **Email** | [Nodemailer](https://nodemailer.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Project Structure

```
StudyBuddy2/
├── components/        # Reusable React components
├── contexts/          # React context providers
├── lib/               # Utility functions and services
├── pages/
│   ├── api/           # API routes
│   └── ...            # Page components
├── public/            # Static assets
├── styles/            # Global styles
└── ...
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run firebase` | Start Firebase emulators |

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please make sure to update tests as appropriate and follow the existing code style.

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

- [Google Classroom API](https://developers.google.com/classroom) for educational data integration
- [Google Gemini](https://ai.google.dev/) for AI-powered assistance
- [Vercel](https://vercel.com/) for seamless deployment
- All the students who provided feedback and feature requests

---