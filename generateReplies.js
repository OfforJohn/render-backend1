// utils/generateReplies.js
let replies = [];
let currentIndex = 0;



export const generateReplies = {
  setReplies: (newReplies) => {
    if (Array.isArray(newReplies)) {
      replies = newReplies.map(reply =>
        typeof reply === "string" ? { content: reply } : reply
      );
      currentIndex = 0;
    }
  },

  getReply: () => {
    if (!replies.length || currentIndex >= replies.length) return ["No replies left."];
    const reply = replies[currentIndex];
    currentIndex++;
    return [reply.content];
  },

  getNextNReplies: (n) => {
    const result = [];
    for (let i = 0; i < n; i++) {
      if (currentIndex < replies.length) {
        result.push(replies[currentIndex].content);
        currentIndex++;
      } else {
        break; // no more unique replies
      }
    }
    return result;
  },

  reset: () => {
    currentIndex = 0;
  }
};

