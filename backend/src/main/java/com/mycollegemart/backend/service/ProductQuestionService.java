package com.mycollegemart.backend.service;

import com.mycollegemart.backend.model.Product;
import com.mycollegemart.backend.model.ProductQuestion;
import com.mycollegemart.backend.model.ProductQuestionAnswer;
import com.mycollegemart.backend.model.User;
import com.mycollegemart.backend.repository.ProductQuestionAnswerRepository;
import com.mycollegemart.backend.repository.ProductQuestionRepository;
import com.mycollegemart.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProductQuestionService {

    private final ProductRepository productRepository;
    private final ProductQuestionRepository productQuestionRepository;
    private final ProductQuestionAnswerRepository productQuestionAnswerRepository;
    private final UserService userService;

    @Autowired
    public ProductQuestionService(
            ProductRepository productRepository,
            ProductQuestionRepository productQuestionRepository,
            ProductQuestionAnswerRepository productQuestionAnswerRepository,
            UserService userService) {
        this.productRepository = productRepository;
        this.productQuestionRepository = productQuestionRepository;
        this.productQuestionAnswerRepository = productQuestionAnswerRepository;
        this.userService = userService;
    }

    public List<Map<String, Object>> getQuestionsForProduct(Long productId) {
        if (productId == null || productRepository.findById(productId).isEmpty()) {
            return List.of();
        }

        List<ProductQuestion> questions = productQuestionRepository.findByProductIdOrderByCreatedAtDesc(productId);
        if (questions.isEmpty()) {
            return List.of();
        }

        List<Long> questionIds = questions.stream()
                .map(ProductQuestion::getId)
                .toList();

        Map<Long, List<ProductQuestionAnswer>> answersByQuestionId = productQuestionAnswerRepository
                .findByQuestionIdInOrderByCreatedAtAsc(questionIds)
                .stream()
                .collect(Collectors.groupingBy(ProductQuestionAnswer::getQuestionId));

        return questions.stream()
                .map(question -> mapQuestion(
                        question,
                        answersByQuestionId.getOrDefault(question.getId(), List.of())))
                .toList();
    }

    public Map<String, Object> createQuestion(Long productId, Long userId, String questionText) {
        ensureProductExists(productId);

        User user = userService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User account not found");
        }

        ProductQuestion question = new ProductQuestion();
        question.setProductId(productId);
        question.setAskedByUserId(user.getId());
        question.setAuthorName(resolveDisplayName(user));
        question.setQuestionText(normalizeQuestionText(questionText));

        ProductQuestion savedQuestion = productQuestionRepository.save(question);
        return mapQuestion(savedQuestion, List.of());
    }

    public Map<String, Object> createAnswer(Long productId, Long questionId, Long userId, String answerText) {
        Product product = ensureProductExists(productId);

        ProductQuestion question = productQuestionRepository
                .findByIdAndProductId(questionId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        User user = userService.findById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User account not found");
        }

        boolean isListingOwner = product.getListedByUserId() != null
                && product.getListedByUserId().equals(user.getId());

        if (!isListingOwner && !userService.isAdmin(user)) {
            throw new IllegalStateException("Only the listing owner or admin can answer questions");
        }

        ProductQuestionAnswer answer = new ProductQuestionAnswer();
        answer.setQuestionId(question.getId());
        answer.setAnsweredByUserId(user.getId());
        answer.setAuthorName(resolveDisplayName(user));
        answer.setAnswerText(normalizeAnswerText(answerText));

        productQuestionAnswerRepository.save(answer);

        List<ProductQuestionAnswer> answers = productQuestionAnswerRepository
                .findByQuestionIdOrderByCreatedAtAsc(question.getId());

        return mapQuestion(question, answers);
    }

    private Product ensureProductExists(Long productId) {
        if (productId == null) {
            throw new IllegalArgumentException("Product not found");
        }

        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
    }

    private String normalizeQuestionText(String value) {
        String normalized = normalizeSentence(value);
        if (normalized.length() < 8) {
            throw new IllegalArgumentException("Question should be at least 8 characters");
        }
        if (normalized.length() > 500) {
            throw new IllegalArgumentException("Question should be under 500 characters");
        }
        return normalized;
    }

    private String normalizeAnswerText(String value) {
        String normalized = normalizeSentence(value);
        if (normalized.length() < 2) {
            throw new IllegalArgumentException("Answer should be at least 2 characters");
        }
        if (normalized.length() > 500) {
            throw new IllegalArgumentException("Answer should be under 500 characters");
        }
        return normalized;
    }

    private String normalizeSentence(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().replaceAll("\\s+", " ");
    }

    private String resolveDisplayName(User user) {
        if (user == null) {
            return "Campus User";
        }

        String displayName = user.getDisplayName();
        if (displayName != null && !displayName.isBlank()) {
            return displayName.trim();
        }

        String email = user.getEmail();
        if (email != null && email.contains("@")) {
            String prefix = email.substring(0, email.indexOf('@')).trim();
            if (!prefix.isBlank()) {
                return prefix;
            }
        }

        return "Campus User";
    }

    private Map<String, Object> mapQuestion(ProductQuestion question, List<ProductQuestionAnswer> answers) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", question.getId());
        payload.put("productId", question.getProductId());
        payload.put("question", question.getQuestionText());
        payload.put("author", question.getAuthorName());
        payload.put("authorUserId", question.getAskedByUserId());
        payload.put("createdAt", question.getCreatedAt());
        payload.put("answers", answers.stream().map(this::mapAnswer).toList());
        payload.put("answerCount", answers.size());
        return payload;
    }

    private Map<String, Object> mapAnswer(ProductQuestionAnswer answer) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", answer.getId());
        payload.put("text", answer.getAnswerText());
        payload.put("author", answer.getAuthorName());
        payload.put("authorUserId", answer.getAnsweredByUserId());
        payload.put("createdAt", answer.getCreatedAt());
        return payload;
    }
}
