# Face Recognition Attendance System 🚀

A modern, dual-backend web architecture providing robust tracking mechanisms isolating roles, utilizing computer vision logic to generate classroom grids, calculating chronological absentee logics, and natively dispensing raw CSV datasets.

## 🛠️ Architecture

*   **Frontend**: Dynamic Modern Glassmorphism/Flat UI leveraging local `Storage` tokens via explicit web DOM matrices.
*   **Database Engine**: Node.js & Express.js interacting with MongoDB Atlas clusters tracking hierarchical Class rosters and chronological Sessions.
*   **CV Microservice**: Python Flask application natively handling OpenCV and math bindings. (Configured to seamlessly transition between `dlib` deep-learning inference or our custom Grayscale structural matrix fallback for Windows hosts without C++ compilers).

---

## 💻 Installation & Setup

You will need **Node.js** and **Python 3** installed on your system.

### 1. The Core Database (Node.js)
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Set up your MongoDB Connection. Create a `.env` file inside the `backend` folder and add your Mongo URI:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abc.mongodb.net/face_attendance
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   *The server runs locally on port 3000.*

### 2. The Vision Microservice (Python)
1. Open a **new** separate terminal and navigate to the `vision_api` folder:
   ```bash
   cd vision_api
   ```
2. *(Optional but recommended)* Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install flask flask-cors pymongo opencv-python numpy
   # Note: To use the official face_recognition AI library natively, ensure your machine has C++ Build Tools installed, then run: pip install face_recognition
   ```
4. Start the computer vision pipeline:
   ```bash
   python app.py
   ```
   *The vision analyzer runs locally on port 5000.*

### 3. The Frontend
There is no complicated build step, React compiling, or bundling required for the frontend! 
1. Simply navigate to the `frontend` folder.
2. Open `index.html` in your web browser (or use VS Code Live Server).

---

## 🎓 Usage Workflow

1. **Register User**: Access the web interface. Select `Student` to bind your face scan to your account, or select `Teacher` to construct the dashboard logic.
2. **Setup Curriculum**: Log in as the Teacher. Create endless Classes, click **Enroll Student**, and input their exact usernames.
3. **Execute Live Checkpoint**: The Teacher clicks `Start Live`. The webcam engages, streaming snapshots securely to the Python pipeline, evaluating the strict subset of attendees iteratively.
4. **Dashboard Insights**: The Teacher ends the session and opens the dynamically updated Class Records, explicitly determining abandoned checkpoints and pushing full relational tracking via `Export CSV`.

## ✨ UI/UX Interface 
The entire frontend has been modeled across structural grids strictly using `Dribbble` modern standards to provide smooth, responsive interactions heavily reliant on visual CSS feedback loops!
