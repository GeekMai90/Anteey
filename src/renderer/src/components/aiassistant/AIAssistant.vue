<TypewriterText
  :content="message.content"
  :message-id="message.id"
  :timestamp="message.timestamp"
  @complete="handleTypeComplete"
/>
