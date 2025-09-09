Poll App - README
A full-stack poll creation and voting application built with Angular, Express, and MongoDB.
## 📂 Project Structure

Poll-App/
│
├── server.js # Express backend server
├── package.json # Backend dependencies & scripts
│
├── client/ # Angular frontend
│ ├── src/
│ │ ├── app/
│ │ │ ├── pages/ # Components (poll list, create poll, detail)
│ │ │ ├── services/ # PollService for API calls
│ │ │ ├── app.routes.ts # Angular routes
│ │ │ └── app.component.ts# Root Angular component
│ │ └── environments/ # API base URL config
│ └── package.json
│
└── README.md # Project documentation



🚀 Features

- Create Polls (question, options, single/multiple choice)
- Vote on polls (single or multiple options)
- View poll results (counts + bar chart)

⚙️ Tech Stack

- Frontend: Angular 17, TypeScript, RxJS, ng2-charts
- Backend: Node.js, Express, Mongoose
- Database: MongoDB (local instance)
- Tools: Visual Studio Code, Git, GitHub

🛠️ Setup & Installation
1. Clone the repository
git clone https://github.com/<your-username>/Poll-App.git
cd Poll-App
2. Install and run backend
npm install
npm run dev
# Server runs at http://localhost:4000
3. Install and run frontend
cd client
npm install
npm start
# Angular runs at http://localhost:4200
🔗 API Endpoints

GET    /api/polls          → List all polls
GET    /api/polls/:id      → Get a single poll
POST   /api/polls          → Create a new poll
PATCH  /api/polls/:id/vote → Vote on a poll

🧩 How it works (flow)

1. CreatePollComponent → PollService → POST /api/polls → Express → Mongoose → MongoDB
2. PollDetailComponent → PollService → GET /api/polls/:id → Express → MongoDB → shows data
3. Voting → PollService → PATCH /api/polls/:id/vote → Express → increments votes → updates results

📝 Future Improvements

- Add user authentication
- Add poll expiration dates
- Shareable results link
- Deployment (backend on Heroku/Render, frontend on Vercel/Netlify)

👨💻 Author
Built with ❤️ using Angular, Express, and MongoDB. Project for learning full-stack development step by step.
