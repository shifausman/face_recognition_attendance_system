import os
import cv2
import numpy as np
try:
    import face_recognition
except ImportError:
    print("WARN: face_recognition missing (dlib requires C++). Using mock fallback for demo.")
    class face_recognition:
        @staticmethod
        def face_locations(image): return [(100, 100, 200, 200)]
        @staticmethod
        def face_encodings(image, locs=None):
            # Primitive Computer Vision: Downscale image to 8x16 (128 pixels) and use it as the feature vector!
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            small = cv2.resize(gray, (8, 16)).flatten().astype(float)
            norm = np.linalg.norm(small)
            return [small / norm if norm > 0 else small]
        @staticmethod
        def face_distance(known, current):
            if not known: return np.empty((0))
            return np.linalg.norm(np.array(known) - current, axis=1)
        @staticmethod
        def compare_faces(k, c, tolerance=0.5): return [d <= tolerance for d in face_recognition.face_distance(k, c)]

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/face_attendance")
client = MongoClient(MONGO_URI)
db = client.get_database()
users_collection = db["users"]

def extract_encoding_from_image(file):
    # Read image from request file
    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    face_locations = face_recognition.face_locations(rgb_image)
    if len(face_locations) == 0:
        return None, "No face found in the image"
    if len(face_locations) > 1:
        return None, "Multiple faces found, please provide an image with a single face"
        
    # Get encoding
    encodings = face_recognition.face_encodings(rgb_image, face_locations)
    return encodings[0].tolist(), None

@app.route('/api/vision/register', methods=['POST'])
def register():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    encoding, error = extract_encoding_from_image(request.files['image'])
    if error:
        return jsonify({"error": error}), 400
        
    return jsonify({"encoding": encoding}), 200

@app.route('/api/vision/recognize', methods=['POST'])
def recognize():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    captured_encoding, error = extract_encoding_from_image(request.files['image'])
    if error:
        return jsonify({"error": error}), 400

    # Scope to specific roster to improve performance and prevent cross-class collisions
    allowed_ids_str = request.form.get('allowed_ids', '')
    query = {"faceEncoding": {"$exists": True}}
    
    if allowed_ids_str:
        from bson.objectid import ObjectId
        valid_ids = [ObjectId(uid.strip()) for uid in allowed_ids_str.split(',') if uid.strip()]
        if valid_ids:
            query["_id"] = {"$in": valid_ids}

    users = list(users_collection.find(query))
    if not users:
        return jsonify({"error": "No registered users found"}), 404

    known_encodings = [np.array(u['faceEncoding']) for u in users]
    known_ids = [str(u['_id']) for u in users]

    # Compare faces
    matches = face_recognition.compare_faces(known_encodings, np.array(captured_encoding), tolerance=0.45)
    face_distances = face_recognition.face_distance(known_encodings, np.array(captured_encoding))
    
    if not any(matches):
        return jsonify({"error": "Unrecognized face"}), 401
    
    best_match_index = np.argmin(face_distances)
    if matches[best_match_index]:
        user_id = known_ids[best_match_index]
        return jsonify({"userId": user_id, "confidence": 1 - face_distances[best_match_index]}), 200
        
    return jsonify({"error": "Unrecognized face"}), 401

if __name__ == '__main__':
    app.run(port=5000, debug=True)
