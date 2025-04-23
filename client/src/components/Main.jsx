import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/router";
import axios from "axios";

import Chat from "@/components/Chat/Chat";
import ChatList from "@/components/Chatlist/ChatList";
import { firebaseAuth } from "../utils/FirebaseConfig";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import { CHECK_USER_ROUTE, GET_MESSAGES_ROUTE, HOST } from "@/utils/ApiRoutes";
import Empty from "./Empty";
import Container from "./Call/Container";
import VideoCall from "./Call/VideoCall";
import VoiceCall from "./Call/VoiceCall";
import IncomingCall from "./common/IncomingCall";
import IncomingVideoCall from "./common/IncomingVideoCall";
import SearchMessages from "./Chat/SearchMessages";

export default function Main() {
  const [
    {
      userInfo,
      currentChatUser,
      videoCall,
      voiceCall,
      incomingVoiceCall,
      incomingVideoCall,
      messageSearch,
      userContacts,
    },
    dispatch,
  ] = useStateProvider();

  const router = useRouter();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );

      // ✅ On successful login
      router.push("/Main");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const socket = useRef();
  const [redirectLogin, setRedirectLogin] = useState(false);
  const [socketEvent, setSocketEvent] = useState(false);

  // 🔁 Redirect on login state change
  useEffect(() => {
    if (redirectLogin) router.push("/login");
  }, [redirectLogin, router]);

  // 👤 Check Auth and User Info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (currentUser) => {
        if (!currentUser) {
          setRedirectLogin(true);
          return;
        }

        if (!userInfo && currentUser.email) {
          try {
            const { data } = await axios.post(CHECK_USER_ROUTE, {
              email: currentUser.email,
            });

            if (!data.status) {
              router.push("/login");
            } else {
              dispatch({
                type: reducerCases.SET_USER_INFO,
                userInfo: {
                  id: data?.data?.id,
                  email: data?.data?.email,
                  name: data?.data?.name,
                  profileImage: data?.data?.profilePicture,
                  status: data?.data?.about,
                },
              });
            }
          } catch (err) {
            console.error("Error verifying user:", err);
            setRedirectLogin(true);
          }
        }
      }
    );

    return () => unsubscribe(); // cleanup
  }, [userInfo, dispatch, router]);

  // 🌐 Setup socket connection
  useEffect(() => {
    if (userInfo) {
      socket.current = io(HOST);
      socket.current.emit("add-user", userInfo.id);
      dispatch({ type: reducerCases.SET_SOCKET, socket });
    }
  }, [userInfo, dispatch]);

  // 🧠 Setup socket events
  useEffect(() => {
    if (socket.current && !socketEvent) {
      socket.current.on("msg-recieve", (data) => {
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: { ...data.message },
        });
      });

      socket.current.on("online-users", ({ onlineUsers }) => {
        dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers });
      });

      socket.current.on("mark-read-recieve", ({ id, recieverId }) => {
        dispatch({
          type: reducerCases.SET_MESSAGES_READ,
          id,
          recieverId,
        });
      });

      socket.current.on("incoming-voice-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("voice-call-rejected", () => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: undefined,
        });
        dispatch({ type: reducerCases.SET_VOICE_CALL, voiceCall: undefined });
      });

      socket.current.on("incoming-video-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("video-call-rejected", () => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: undefined,
        });
        dispatch({ type: reducerCases.SET_VIDEO_CALL, videoCall: undefined });
      });

      setSocketEvent(true);
    }
  }, [dispatch, socketEvent]);

  // 💬 Fetch chat messages
  useEffect(() => {
    const getMessages = async () => {
      const {
        data: { messages },
      } = await axios.get(
        `${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`
      );

      dispatch({ type: reducerCases.SET_MESSAGES, messages });
    };

    if (
      currentChatUser &&
      userContacts.findIndex((contact) => contact.id === currentChatUser.id) !==
        -1
    ) {
      getMessages();
    }
  }, [currentChatUser, dispatch, userContacts, userInfo?.id]);

  return (
    <>
      {incomingVoiceCall && <IncomingCall />}
      {incomingVideoCall && <IncomingVideoCall />}

      {videoCall ? (
        <div className="h-screen w-screen max-h-full max-w-full overflow-hidden">
          <VideoCall />
        </div>
      ) : voiceCall ? (
        <div className="h-screen w-screen max-h-full max-w-full overflow-hidden">
          <VoiceCall />
        </div>
      ) : (
        <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full overflow-hidden">
          <ChatList />
          {currentChatUser ? (
            <div className={messageSearch ? "grid grid-cols-2" : "grid-cols-2"}>
              <Chat />
              {messageSearch && <SearchMessages />}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </>
  );
}
