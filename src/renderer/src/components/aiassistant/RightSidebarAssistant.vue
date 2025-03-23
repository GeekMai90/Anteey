<TypewriterText
  :content="message.content"
  :message-id="message.id"
  :timestamp="message.timestamp"
  :instant="true"
/>

// 在收到后端响应后立即标记消息为已显示 const handleChatResponse = async (response) => { try { //
... 现有处理代码 ... // 立即标记消息为已显示 if (response.messages && response.messages.length > 0)
{ const lastMessage = response.messages[response.messages.length - 1]; if (lastMessage.role ===
'assistant') { assistantStore.markMessageAsDisplayed(lastMessage.id); } } // ... 其他代码 ... }
catch (error) { // ... 错误处理 ... } }
