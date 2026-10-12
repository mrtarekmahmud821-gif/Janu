// netlify/functions/check-membership.js
// অথবা Vercel: api/check-membership.js

const axios = require("axios");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function normalizeChatId(raw) {
  if (!raw) return null;
  let id = String(raw).trim();

  if (id.includes("t.me/")) id = id.split("t.me/")[1] || id;
  if (id.includes("/")) id = id.split("/")[0];
  if (id.includes("?")) id = id.split("?")[0];
  id = id.replace(/^@/, "").trim();

  // numeric / private group (-100...) রাখুন যেমন আছে
  if (/^-?\d+$/.test(id)) return id;
  return "@" + id;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userId = body.userId ? String(body.userId).trim() : null;
    let chatId = normalizeChatId(body.chatId);

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ joined: false, error: "Bot token missing" }) };
    }
    if (!userId || !chatId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ joined: false, error: "Missing userId or chatId" }) };
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
    const { data } = await axios.get(url, {
      params: { chat_id: chatId, user_id: userId },
      timeout: 8000
    });

    if (!data.ok) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ joined: false, error: data.description || "Telegram API error" })
      };
    }

    const status = data.result?.status || "";
    // left / kicked / restricted (যদি নতুন মেসেজ পাঠাতে না পারে) = not joined
    const isJoined = ["member", "administrator", "creator"].includes(status);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        joined: isJoined,
        status: status // ডিবাগের জন্য (প্রোডাকশনে চাইলে সরিয়ে দিন)
      })
    };
  } catch (error) {
    const tgError = error.response?.data;
    const statusCode = error.response?.status;

    // বট অ্যাডমিন না / চ্যানেল পায় না
    if (statusCode === 400 || statusCode === 403) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          joined: false,
          error: tgError?.description || "Bot is not admin or cannot access this chat"
        })
      };
    }

    console.error("check-membership:", tgError || error.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ joined: false, error: "Internal Server Error" })
    };
  }
};
