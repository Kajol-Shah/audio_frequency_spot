# Audio Frequency Spot

## Overview
This is a React application that allows real-time audio streaming between two users using WebRTC and WebSocket for signaling. The app also includes basic audio manipulation with a frequency and gain filter, as well as real-time audio visualization.

## Approach
### Step 1: Audio Streaming
- Implemented WebRTC for peer-to-peer audio communication.
- Used WebSocket for signaling between users.

### Step 2: Audio Manipulation
- Added a basic audio filter (low-pass filter with a 200Hz frequency range) using the Web Audio API.
- Implemented a gain node to adjust the audio level.

### Step 3: Audio Visualization
- Visualized the audio stream as a waveform using the Canvas API and the Web Audio API's AnalyserNode.

## Tools Used
- **React**: For building the user interface.
- **WebRTC**: For peer-to-peer audio streaming.
- **WebSocket**: For signaling between users.
- **Web Audio API**: For audio manipulation and visualization.

## Challenges Encountered
- Managing the Web Audio API nodes dynamically without causing errors such as trying to disconnect nodes that weren't connected.
- Ensuring the audio filters could be toggled on and off seamlessly during live streaming.
- Creating the basic app while keeping the code modular and maintainable.

## How to Run
1. Clone the repository
2. Start Server
3. Navigate cd audio-frequency-spot/Server
4. npm install
5. npm start
6. Start Client
7. Navigate cd audio-frequency-spot/Client
8. npm install
9. npm start
10. Enter User ID in one of the peer application and start the call 
   
