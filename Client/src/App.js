import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // Import the CSS file

let socket;

function App() {
  const [yourID, setYourID] = useState("");
  const [targetID, setTargetID] = useState("");
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(false); // State for toggling filter

  const localStreamRef = useRef();
  const remoteStreamRef = useRef();
  const connectionRef = useRef(null);
  const audioContextRef = useRef(null); // Audio context for processing
  const filterNodeRef = useRef(null); // Filter node for processing
  const gainNodeRef = useRef(null); // Gain node for processing
  const analyserRef = useRef(null); // Analyser node for visualization
  const canvasRef = useRef(null); // Canvas for visualization

  useEffect(() => {
    socket = new WebSocket('ws://localhost:5000');

    socket.onopen = () => {
      console.log('WebSocket connection opened');
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log(`Message received from server:`, data);

      if (data.type === 'assign-id') {
        setYourID(data.id);
        console.log(`Assigned ID from server: ${data.id}`);
      }

      if (data.type === 'offer') {
        console.log(`Received offer from ID: ${data.sender}`);
        setReceivingCall(true);
        setCallerSignal(data.signal);
        setTargetID(data.sender); // Set the target ID to the sender's ID
      }

      if (data.type === 'answer') {
        console.log(`Received answer from ID: ${data.sender}`);
        if (connectionRef.current) {
          connectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
        }
      }

      if (data.type === 'ice-candidate') {
        console.log(`Received ICE candidate from ID: ${data.sender}`);
        if (connectionRef.current) {
          connectionRef.current.addIceCandidate(new RTCIceCandidate(data.signal));
        }
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  const startCall = async () => {
    console.log(`Calling user with ID: ${targetID} from ID: ${yourID}`);

    const peerConnection = new RTCPeerConnection();
    connectionRef.current = peerConnection;

    // Add local audio stream to peer connection
    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'ice-candidate',
          sender: yourID,
          target: targetID,
          signal: event.candidate,
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current.srcObject = remoteStream;

      // Apply filter and visualization if enabled
      if (filterEnabled) {
        applyFilter(remoteStream);
      }
      visualizeAudio(remoteStream);
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
      type: 'offer',
      sender: yourID,
      target: targetID,
      signal: offer,
    }));
  };

  const acceptCall = async () => {
    console.log(`Accepting call from ID: ${targetID}`);
    setCallAccepted(true);

    const peerConnection = new RTCPeerConnection();
    connectionRef.current = peerConnection;

    // Add local audio stream to peer connection
    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: 'ice-candidate',
          sender: yourID,
          target: targetID,
          signal: event.candidate,
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current.srcObject = remoteStream;

      // Apply filter and visualization if enabled
      if (filterEnabled) {
        applyFilter(remoteStream);
      }
      visualizeAudio(remoteStream);
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(callerSignal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.send(JSON.stringify({
      type: 'answer',
      sender: yourID,
      target: targetID,
      signal: answer,
    }));
  };

  const applyFilter = (stream) => {
    const audioContext = audioContextRef.current || new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();

    // Set up filter node
    filterNode.type = 'lowpass'; // Lowpass filter to let frequencies below 200 Hz pass through
    filterNode.frequency.value = 200; // Frequency in Hz

    // Set up gain node
    gainNode.gain.setValueAtTime(0.75, audioContext.currentTime); // Set gain level to 0.75

    // Disconnect previous nodes if they exist
    if (filterNodeRef.current && gainNodeRef.current && audioContextRef.current) {
      try {
        filterNodeRef.current.disconnect(gainNodeRef.current);
        gainNodeRef.current.disconnect(audioContextRef.current.destination);
      } catch (error) {
        console.warn("Nodes were not connected:", error);
      }
    }

    // Connect the new nodes
    source.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Save the filter and gain node references
    filterNodeRef.current = filterNode;
    gainNodeRef.current = gainNode;
  };


  useEffect(() => {
    // Get user audio stream
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStreamRef.current = stream;
      })
      .catch(error => {
        console.error('Error accessing user media:', error);
      });
  }, []);

  const toggleFilter = () => {
    setFilterEnabled(prev => !prev);

    if (filterEnabled && remoteStreamRef.current) {
      // Apply filter if enabled
      applyFilter(remoteStreamRef.current.srcObject);
    } else if (!filterEnabled && gainNodeRef.current) {
      // Remove filter by setting gain to 0 if disabled
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
  };

  const endCall = () => {
    // Close the peer connection and stop all tracks
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset the remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.srcObject = null;
    }

    // Reset state
    setReceivingCall(false);
    setCallerSignal(null);
    setCallAccepted(false);
    setFilterEnabled(false);

    // Optionally reload the page
    window.location.reload();
  };

  const visualizeAudio = (stream) => {
    const audioContext = audioContextRef.current || new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Determines the frequency resolution
    analyserRef.current = analyser;

    source.connect(analyser);

    // Visualize the waveform on the canvas
    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext("2d");

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasContext.fillStyle = "rgb(200, 200, 200)";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = "rgb(0, 0, 0)";

      canvasContext.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasContext.lineTo(canvas.width, canvas.height / 2);
      canvasContext.stroke();
    };

    draw();
  };

  return (

    <div className="container">
    <h1 id="title">Audio Frequency Spot</h1>
      <h2>Your User ID: {yourID}</h2>
      <input
        type="text"
        placeholder="Enter Target User ID"
        value={targetID}
        onChange={(e) => setTargetID(e.target.value)}
      />
      <button onClick={startCall} disabled={!targetID}>
        Call User
      </button>

      {receivingCall && !callAccepted && (
        <div className="call-alert">
          <h2>Incoming call...</h2>
          <button onClick={acceptCall}>Accept Call</button>
        </div>
      )}

      {callAccepted && (
        <div>
          <h2>Call in Progress</h2>
          <button onClick={endCall}>End Call</button>
        </div>
      )}

      <div>

        <audio ref={localStreamRef} autoPlay muted />
      </div>
      <div>

        <audio ref={remoteStreamRef} autoPlay />
      </div>

      <div>
        <button onClick={toggleFilter}>
          {filterEnabled ? 'Disable Filter' : 'Enable Filter'}
        </button>
      </div>

      <div>
        <h2>Audio Visualization:</h2>
        <canvas ref={canvasRef} width="500" height="200" />
      </div>
    </div>

  );
}

export default App;