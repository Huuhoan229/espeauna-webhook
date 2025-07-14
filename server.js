app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      if (!entry.messaging || entry.messaging.length === 0) continue;

      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender?.id;
      const received_message = webhook_event.message?.text;

      if (received_message) {
        const reply = await getGeminiReply(received_message);
        await callSendAPI(sender_psid, reply);
      } else {
        console.log('Webhook event không có message text:', webhook_event);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});
