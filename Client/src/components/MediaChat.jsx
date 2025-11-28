import React, { useEffect, useRef, useState } from "react";
import socket from "./Socket";

const MediaChat = ({ roomid }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const peerConnectionRef = useRef(null);

  // STUN servers for ICE
  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    // Get local media stream
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        socket.emit("join-media-room", roomid);
      } catch (err) {
        console.error("Failed to get media stream", err);
      }
    }

    getMedia();

    // Clean up on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomid]);

  useEffect(() => {
    socket.on("media-offer", async (offer) => {
      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      localStream.getTracks().forEach((track) =>
        peerConnectionRef.current.addTrack(track, localStream)
      );

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      await peerConnectionRef.current.setRemoteDescription(offer);

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit("media-answer", answer);
    });

    socket.on("media-answer", async (answer) => {
      await peerConnectionRef.current.setRemoteDescription(answer);
    });

    socket.on("media-ice-candidate", async (candidate) => {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    });

    return () => {
      socket.off("media-offer");
      socket.off("media-answer");
      socket.off("media-ice-candidate");
    };
  }, [localStream]);

  useEffect(() => {
    // When local stream is ready, create peer connection & offer
    if (localStream) {
      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      localStream.getTracks().forEach((track) =>
        peerConnectionRef.current.addTrack(track, localStream)
      );

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("media-ice-candidate", event.candidate);
        }
      };

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      async function createOffer() {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socket.emit("media-offer", offer);
      }

      createOffer();
    }
  }, [localStream]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  return (
    <div className="media-chat flex flex-col space-y-4 p-4 bg-[#1e1e2f] rounded">
      <div className="flex space-x-4">
        <div className="flex flex-col items-center">
          <h4 className="text-white mb-2">You</h4>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-48 h-36 bg-black rounded"
          />
        </div>
        <div className="flex flex-col items-center">
          <h4 className="text-white mb-2">Remote</h4>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-48 h-36 bg-black rounded"
          />
        </div>
      </div>
      
      <div className="flex justify-center space-x-3">
        <button
          onClick={toggleVideo}
          className={`px-4 py-2 rounded text-white ${
            isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isVideoEnabled ? '📹 Video On' : '📹 Video Off'}
        </button>
        <button
          onClick={toggleAudio}
          className={`px-4 py-2 rounded text-white ${
            isAudioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? '🎤 Audio On' : '🎤 Audio Off'}
        </button>
      </div>
    </div>
  );
};

export default MediaChat;
