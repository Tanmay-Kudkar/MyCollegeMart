package com.mycollegemart.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AiAssistantService {

    private static final Set<String> SUPPORTED_ASSISTANTS = Set.of("MARKETMATE", "STUDY_PLANNER");
    private static final int MAX_HISTORY_ITEMS = 8;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiBaseUrl;
    private final String apiKey;
    private final String model;
    private final String referer;
    private final String appName;
    private final int timeoutMs;

    public AiAssistantService(
            ObjectMapper objectMapper,
            @Value("${ai.chat.base-url:https://openrouter.ai/api/v1}") String apiBaseUrl,
            @Value("${ai.chat.api-key:}") String apiKey,
            @Value("${ai.chat.model:meta-llama/llama-3.1-8b-instruct:free}") String model,
            @Value("${ai.chat.referer:http://localhost:3000}") String referer,
            @Value("${ai.chat.app-name:MyCollegeMart}") String appName,
            @Value("${ai.chat.timeout-ms:30000}") int timeoutMs) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.apiBaseUrl = stripTrailingSlash(apiBaseUrl);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null || model.isBlank() ? "meta-llama/llama-3.1-8b-instruct:free" : model.trim();
        this.referer = referer == null ? "" : referer.trim();
        this.appName = appName == null ? "" : appName.trim();
        this.timeoutMs = Math.max(5000, timeoutMs);
    }

    public String chat(String assistantTypeRaw, String messageRaw, List<ChatTurn> history) {
        String assistantType = normalizeAssistantType(assistantTypeRaw);
        String message = normalizeMessage(messageRaw);

        if (message.isBlank()) {
            throw new IllegalArgumentException("Message is required");
        }

        if (message.length() > 2000) {
            throw new IllegalArgumentException("Message is too long");
        }

        if (apiKey.isBlank()) {
            throw new IllegalStateException(
                    "AI chat is not configured. Set AI_CHAT_API_KEY on backend (free OpenRouter key works).");
        }

        try {
            String payloadJson = objectMapper.writeValueAsString(buildProviderRequest(assistantType, message, history));
            String providerResponse = callProvider(payloadJson);
            String reply = extractAssistantReply(providerResponse);

            if (reply.isBlank()) {
                throw new IllegalStateException("AI provider returned an empty response.");
            }

            return reply;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to process AI provider response", e);
        }
    }

    private ObjectNode buildProviderRequest(String assistantType, String message, List<ChatTurn> history) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", model);
        payload.put("temperature", "STUDY_PLANNER".equals(assistantType) ? 0.6 : 0.7);
        payload.put("max_tokens", "STUDY_PLANNER".equals(assistantType) ? 450 : 280);

        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(buildMessage("system", buildSystemPrompt(assistantType)));

        List<ChatTurn> safeHistory = history == null ? List.of() : history;
        int start = Math.max(0, safeHistory.size() - MAX_HISTORY_ITEMS);
        for (int i = start; i < safeHistory.size(); i++) {
            ChatTurn turn = safeHistory.get(i);
            String role = normalizeRole(turn.role());
            String text = normalizeMessage(turn.text());

            if (!text.isBlank() && ("user".equals(role) || "assistant".equals(role))) {
                messages.add(buildMessage(role, text));
            }
        }

        messages.add(buildMessage("user", message));
        payload.set("messages", messages);

        return payload;
    }

    private String callProvider(String payloadJson) {
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(apiBaseUrl + "/chat/completions"))
                .timeout(Duration.ofMillis(timeoutMs))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payloadJson));

        if (!referer.isBlank()) {
            requestBuilder.header("HTTP-Referer", referer);
        }
        if (!appName.isBlank()) {
            requestBuilder.header("X-Title", appName);
        }

        try {
            HttpResponse<String> response = httpClient.send(requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();
            String body = response.body() == null ? "" : response.body();

            if (statusCode < 200 || statusCode >= 300) {
                throw new IllegalStateException(buildProviderErrorMessage(statusCode, body));
            }

            return body;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to reach AI provider", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI request was interrupted", e);
        }
    }

    private String extractAssistantReply(String providerResponse) throws IOException {
        JsonNode root = objectMapper.readTree(providerResponse);
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            return "";
        }

        return choices.get(0).path("message").path("content").asText("").trim();
    }

    private String buildProviderErrorMessage(int statusCode, String responseBody) {
        String extracted = extractProviderErrorText(responseBody);

        if (statusCode == 401 || statusCode == 403) {
            return "AI provider rejected the API key or model access. Check AI_CHAT_API_KEY and AI_CHAT_MODEL.";
        }

        if (extracted.isBlank()) {
            return "AI provider request failed with status " + statusCode;
        }

        return "AI provider request failed: " + extracted;
    }

    private String extractProviderErrorText(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "";
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String fromErrorObject = root.path("error").path("message").asText("").trim();
            if (!fromErrorObject.isBlank()) {
                return fromErrorObject;
            }
        } catch (IOException ignored) {
            // If parsing fails, fall back to raw text.
        }

        return responseBody.length() > 180
                ? responseBody.substring(0, 180)
                : responseBody;
    }

    private ObjectNode buildMessage(String role, String content) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("role", role);
        node.put("content", content);
        return node;
    }

    private String normalizeAssistantType(String assistantTypeRaw) {
        String normalized = assistantTypeRaw == null
                ? ""
                : assistantTypeRaw.trim().toUpperCase(Locale.ROOT);

        if (!SUPPORTED_ASSISTANTS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported assistant type");
        }

        return normalized;
    }

    private String normalizeRole(String roleRaw) {
        if (roleRaw == null) {
            return "";
        }

        String role = roleRaw.trim().toLowerCase(Locale.ROOT);
        if ("bot".equals(role)) {
            return "assistant";
        }

        return role;
    }

    private String normalizeMessage(String raw) {
        if (raw == null) {
            return "";
        }

        return raw.replace("\r", "").trim();
    }

    private String buildSystemPrompt(String assistantType) {
        if ("STUDY_PLANNER".equals(assistantType)) {
            return """
                    You are AI Study Planner for MyCollegeMart.
                    Help students create practical, realistic study plans.

                    Rules:
                    - If key details are missing (subject, exam date, weekly hours), ask for them first.
                    - Provide concise plans with day-wise bullets when enough info is available.
                    - Include revision blocks and practice-test strategy.
                    - Keep responses readable and supportive.
                    """;
        }

        return """
                You are MarketMate, the assistant for MyCollegeMart (college marketplace app).
                Help users with product discovery, pricing, checkout, prime membership, selling flow, and account settings.

                Rules:
                - Be concise and practical.
                - Use short bullets when suitable.
                - If user request is unclear, ask one focused follow-up question.
                - Do not invent exact stock numbers or unavailable product details.
                - When relevant, mention app pages: Home, Marketplace, Skill Marketplace, Account, Settings, Sell, Checkout.
                """;
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://openrouter.ai/api/v1";
        }

        return value.replaceAll("/+$", "");
    }

    public record ChatTurn(String role, String text) {
    }
}
