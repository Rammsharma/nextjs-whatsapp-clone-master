import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStateProvider } from "@/context/StateContext";

const Container = dynamic(() => import("@/components/Call/Container"), {
  ssr: false,
});

function VideoCall() {
  const [{ videoCall, socket, userInfo }] = useStateProvider();

  useEffect(() => {
    // Log to check the data structure and if it's being set correctly
    console.warn("📹 Video Call Debug Info:", {
      videoCall,
      userInfo,
      socket: socket?.current,
    });

    // Check if all required videoCall properties exist
    const isValidCall =
      videoCall &&
      videoCall.id &&
      videoCall.roomId &&
      videoCall.callType &&
      userInfo &&
      userInfo.id &&
      userInfo.name &&
      socket?.current;

    // If data is missing, log the error and prevent further actions
    if (!isValidCall) {
      console.error("❌ Invalid call or user data:", {
        videoCall,
        userInfo,
        socket,
      });
      return;
    }

    // If the call type is outgoing, emit the outgoing call event
    if (videoCall.type === "out-going") {
      socket.current.emit("outgoing-video-call", {
        to: videoCall.id,
        from: {
          id: userInfo.id,
          profilePicture: userInfo.profileImage || "", // Fallback
          name: userInfo.name,
        },
        callType: videoCall.callType,
        roomId: videoCall.roomId,
      });
    }
  }, [videoCall, socket, userInfo]);

  const isReady =
    videoCall &&
    videoCall.roomId &&
    videoCall.callType &&
    videoCall.name &&
    videoCall.profilePicture;

  return isReady ? (
    <Container data={videoCall} />
  ) : (
    <div className="text-white text-center p-4">
      Preparing call interface...
    </div>
  );
}

export default VideoCall;
