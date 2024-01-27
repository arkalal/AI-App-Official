"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "../../axios/openAiApi";
import styles from "./GenImage.module.scss";
import { useSession } from "next-auth/react";
import SigninPopup from "../Reusable/popups/SigninPopup/SigninPopup";
import { chatLogic } from "../../utils/serverApiLogics";
import BuyTokenPopup from "../Reusable/popups/BuyTokenPopup/BuyTokenPopup";
import ReduxProvider from "../../redux/ReduxProvider";
import AITokenWallet from "../Reusable/AITokenWallet/AITokenWallet";
import { connect } from "react-redux";
import * as dispatcher from "../../redux/store/dispatchers";
import BlueButton from "../Reusable/BlueButton/BlueButton";

const GenImage = ({ dispatchTokenValue }) => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [Loading, setLoading] = useState(false);
  const [SignInPop, setSignInPop] = useState(false);
  const [IsTokenPopup, setIsTokenPopup] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);

  const { data: session } = useSession();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setMessageHistory((messageHistory) => [
        ...messageHistory,
        { text: prompt, imageUrl: "", loading: true },
      ]);

      setLoading(true);
      setPrompt("");

      const postPrompt = {
        prompt,
      };
      const response = await axios.post("imageGen", postPrompt);

      const data = await response.data;
      console.log("data", data);

      // Update the last entry of messageHistory with the new image URL
      setMessageHistory((currentHistory) =>
        currentHistory.map((message, index) =>
          index === currentHistory.length - 1 // Correct the index check here
            ? { ...message, imageUrl: data.imageUrl, loading: false }
            : message
        )
      );
      setLoading(false);
    } catch (error) {
      console.error("Error generating image:", error);

      // If there's an error, update the loading state to false
      setMessageHistory((currentHistory) =>
        currentHistory.map((message, index) =>
          index === currentHistory.length - 1
            ? { ...message, loading: false }
            : message
        )
      );
    }
  };

  const handleGenImage = async (event) => {
    event.preventDefault();

    if (prompt) {
      try {
        if (!session) {
          setSignInPop(true);
          return;
        } else {
          setSignInPop(false);

          const chatLog = await chatLogic();

          if (
            chatLog.isUserToken &&
            chatLog.isUserToken.count &&
            !chatLog.isUserToken.lock
          ) {
            localStorage.setItem("AITokens", chatLog.isUserToken.count - 1);
            dispatchTokenValue(chatLog.isUserToken.count - 1);
          }

          if (!chatLog.isUserToken || !chatLog.isUserToken.lock) {
            handleSubmit(event);
          } else {
            setIsTokenPopup(true);
            return;
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const chatContainerRef = useRef("");

  useEffect(() => {
    const chatBox = chatContainerRef.current;

    // Function to smoothly scroll to the bottom
    const scrollToBottom = () => {
      chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth",
      });
    };

    // Call scrollToBottom whenever the chatHistory updates
    scrollToBottom();
  }, [messageHistory]);

  return (
    <div className={styles.GenImage}>
      {SignInPop && (
        <>
          <SigninPopup setIsSigninPopup={setSignInPop} />
        </>
      )}

      {IsTokenPopup && (
        <>
          <BuyTokenPopup />
        </>
      )}

      {session && (
        <>
          <div className={styles.tokenWallet}>
            <ReduxProvider>
              <AITokenWallet />
            </ReduxProvider>
          </div>
        </>
      )}

      {/* <div className={styles.AiImage}>
        {imageUrl && !Loading ? (
          <img height={500} width={500} src={imageUrl} alt="" />
        ) : !imageUrl && !Loading ? (
          <>
            <h2>No Images rendered</h2>
          </>
        ) : (
          Loading && (
            <>
              <h1>Loading...</h1>
            </>
          )
        )}
      </div> */}

      <div ref={chatContainerRef} className={styles.chatContainer}>
        {messageHistory.map((message, index) => (
          <div key={index} className={styles.messagePair}>
            <div className={styles.imageContainer}>
              {message.loading ? (
                <p>Generating image...</p>
              ) : (
                <img
                  height={500}
                  width={500}
                  src={message.imageUrl}
                  alt="Generated"
                />
              )}
            </div>
            <p className={styles.userPrompt}>{message.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleGenImage}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type and Generate your image"
        />
        <BlueButton type="submit" text="Generate Image" />
      </form>
    </div>
  );
};

export default connect(null, dispatcher)(GenImage);
