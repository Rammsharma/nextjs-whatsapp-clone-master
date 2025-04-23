import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { GET_CALL_TOKEN } from "@/utils/ApiRoutes";
import axios from "axios";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { MdOutlineCallEnd } from "react-icons/md";

function Container({ data }) {
  const [{ socket, userInfo }, dispatch] = useStateProvider();

  const [localStream, setLocalStream] = useState(null);
  const [publishStream, setPublishStream] = useState(null);
  const [token, setToken] = useState(null);
  const [zgVar, setZgVar] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);

  // Ensure data exists
  if (!data || !data.roomId || !userInfo) {
    console.error("⚠️ Missing required video call data", { data, userInfo });
    return <div className="text-white p-10">Call setup error.</div>;
  }

  // Accept call logic
  useEffect(() => {
    if (data.type === "out-going") {
      const acceptHandler = () => setCallAccepted(true);
      socket?.current?.on("accept-call", acceptHandler);
      return () => socket?.current?.off("accept-call", acceptHandler);
    } else {
      const timeout = setTimeout(() => setCallAccepted(true), 1000);
      return () => clearTimeout(timeout);
    }
  }, [data.type, socket]);

  // Get call token
  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await axios.get(`${GET_CALL_TOKEN}/${userInfo.id}`);
        setToken(res.data.token);
      } catch (err) {
        console.error("Failed to get token:", err);
      }
    };

    if (callAccepted) getToken();
  }, [callAccepted, userInfo?.id]);

  // Start call
  useEffect(() => {
    if (!token || callStarted) return;

    const startCall = async () => {
      try {
        const { ZegoExpressEngine } = await import(
          "zego-express-engine-webrtc"
        );

        const zg = new ZegoExpressEngine(
          process.env.NEXT_PUBLIC_ZEGO_APP_ID,
          process.env.NEXT_PUBLIC_ZEGO_SERVER_ID
        );
        setZgVar(zg);

        // Handle remote stream
        zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
          if (updateType === "ADD" && streamList[0]) {
            const vd = document.createElement(
              data.callType === "video" ? "video" : "audio"
            );
            vd.id = streamList[0].streamID;
            vd.autoplay = true;
            vd.playsInline = true;
            vd.muted = false;

            const rmVideo = document.getElementById("remote-video");
            if (rmVideo) rmVideo.appendChild(vd);

            const stream = await zg.startPlayingStream(streamList[0].streamID, {
              audio: true,
              video: true,
            });
            vd.srcObject = stream;
          } else if (updateType === "DELETE") {
            zg?.stopPublishingStream(streamList[0]?.streamID);
            zg?.destroyStream(localStream);
            zg?.logoutRoom(data.roomId.toString());
            dispatch({ type: reducerCases.END_CALL });
          }
        });

        await zg.loginRoom(
          data.roomId.toString(),
          token,
          { userID: userInfo.id.toString(), userName: userInfo.name },
          { userUpdate: true }
        );

        const stream = await zg.createStream({
          camera: {
            audio: true,
            video: data.callType === "video",
          },
        });

        setLocalStream(stream);

        // Local preview
        setTimeout(() => {
          const localContainer = document.getElementById("local-video");
          const el = document.createElement(
            data.callType === "video" ? "video" : "audio"
          );
          el.id = "audio-local";
          el.className = "h-28 w-32";
          el.autoplay = true;
          el.muted = true;
          el.playsInline = true;
          el.srcObject = stream;
          localContainer?.appendChild(el);

          const streamID = "123" + Date.now();
          setPublishStream(streamID);
          zg.startPublishingStream(streamID, stream);
        }, 1000);
      } catch (err) {
        console.error("Failed to start call:", err);
      }
    };

    startCall();
    setCallStarted(true);
  }, [token]);

  // End call handler
  const endCall = () => {
    socket?.current?.emit("reject-voice-call", { from: data.id });

    if (zgVar && localStream && publishStream) {
      zgVar.destroyStream(localStream);
      zgVar.stopPublishingStream(publishStream);
      zgVar.logoutRoom(data.roomId.toString());
    }

    dispatch({ type: reducerCases.END_CALL });
  };

  return (
    <div className="border-conversation-border border-l w-full bg-conversation-panel-background flex flex-col h-[100vh] overflow-hidden items-center justify-center text-white">
      <div className="flex flex-col gap-3 items-center">
        <span className="text-5xl">{data.name || "Unknown User"}</span>
        <span className="text-lg">
          {callAccepted && data.callType !== "video"
            ? "On going call"
            : "Calling"}
        </span>
      </div>

      {(!callAccepted || data.callType === "audio") && (
        <div className="my-24">
          <Image
            src={data.profilePicture || "/default-avatar.png"}
            alt="avatar"
            height={300}
            width={300}
            className="rounded-full"
          />
        </div>
      )}

      <div className="my-5 relative" id="remote-video">
        <div className="absolute bottom-5 right-5" id="local-video"></div>
      </div>

      <div
        className="rounded-full h-16 w-16 bg-red-600 flex items-center justify-center mt-8 cursor-pointer"
        onClick={endCall}
      >
        <MdOutlineCallEnd className="text-3xl" />
      </div>
    </div>
  );
}

export default Container;
