(function feedbackOSBootstrap(global) {
  var state = {
    apiKey: null,
    apiHost: null,
    environmentId: null,
    workspace: null,
    userId: null,
    email: null,
    attributes: {},
    hiddenFields: {},
    queue: [],
  };

  function now() {
    return new Date().toISOString();
  }

  function restoreQueue() {
    state.queue = [];
  }

  function persistQueue() {
    // Event payloads may contain respondent data; keep the queue in memory only.
  }

  function emit(type, payload) {
    var event = {
      id: "evt-" + Math.random().toString(36).slice(2),
      type: type,
      payload: payload || {},
      context: {
        environmentId: state.environmentId,
        workspace: state.workspace,
        userId: state.userId,
        email: state.email,
        attributes: state.attributes,
        hiddenFields: state.hiddenFields,
      },
      createdAt: now(),
    };
    state.queue.push(event);
    persistQueue();
    global.dispatchEvent(new CustomEvent("feedbackos:event", { detail: event }));
    return event;
  }

  function postEvent(event) {
    if (!state.apiHost) return;
    try {
      global.fetch(String(state.apiHost).replace(/\/$/, "") + "/api/v1/client/events", {
        method: "POST",
        keepalive: true,
        headers: {
          "content-type": "application/json",
          "x-api-key": state.apiKey || "",
        },
        body: JSON.stringify(event),
      }).catch(function () {
        // Network delivery is best-effort for the embeddable SDK.
      });
    } catch {
      // Fetch can be unavailable in strict embeds; the event remains queued.
    }
  }

  function postResponse(surveyId, score, comment) {
    if (!state.apiHost || !state.environmentId) return Promise.resolve(false);
    return global.fetch(String(state.apiHost).replace(/\/$/, "") + "/api/v1/client/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-feedbackos-environment-id": state.environmentId,
        "x-api-key": state.apiKey || "",
      },
      body: JSON.stringify({
        surveyId: surveyId,
        score: score,
        answers: { comment: comment },
        respondent: {
          attributes: state.attributes,
          email: state.email || "",
          name: state.userId || "Anonymous",
        },
        context: {
          environmentId: state.environmentId,
          userId: state.userId,
        },
        source: "public-sdk",
      }),
    }).then(function (response) {
      return response.ok;
    }).catch(function () {
      return false;
    });
  }

  function renderWidget(options) {
    options = options || {};
    var existing = document.querySelector("[data-feedbackos-widget]");
    if (existing) existing.remove();

    var shell = document.createElement("section");
    shell.setAttribute("data-feedbackos-widget", "true");
    shell.style.cssText =
      "position:fixed;right:20px;bottom:20px;z-index:99999;width:min(380px,calc(100vw - 40px));" +
      "background:#fff;border:1px solid #d9e1db;border-radius:8px;box-shadow:0 18px 50px rgba(21,32,27,.18);" +
      "font-family:Arial,Helvetica,sans-serif;color:#15201b;overflow:hidden;";

    var header = document.createElement("div");
    header.style.cssText = "padding:14px 16px;border-bottom:1px solid #d9e1db;display:flex;justify-content:space-between;gap:12px;";
    var title = document.createElement("strong");
    title.textContent = String(options.title || "Share feedback");
    var close = document.createElement("button");
    close.setAttribute("aria-label", "Close feedback");
    close.textContent = "x";
    close.style.cssText = "border:0;background:transparent;font-size:18px;cursor:pointer;";
    header.append(title, close);

    var body = document.createElement("div");
    body.style.cssText = "padding:16px;display:grid;gap:10px;";
    var scoreLabel = document.createElement("label");
    scoreLabel.textContent = "Score";
    scoreLabel.style.cssText = "display:grid;gap:6px;font-size:13px;font-weight:700;";
    var scoreInput = document.createElement("input");
    scoreInput.type = "number";
    scoreInput.min = "0";
    scoreInput.max = "10";
    scoreInput.required = true;
    scoreInput.placeholder = "0-10";
    scoreInput.setAttribute("data-feedbackos-score", "true");
    scoreInput.style.cssText = "padding:9px;border:1px solid #cbd6cf;border-radius:8px;";
    scoreLabel.append(scoreInput);

    var commentLabel = document.createElement("label");
    commentLabel.textContent = "Comment";
    commentLabel.style.cssText = "display:grid;gap:6px;font-size:13px;font-weight:700;";
    var commentInput = document.createElement("textarea");
    commentInput.setAttribute("data-feedbackos-comment", "true");
    commentInput.maxLength = 4000;
    commentInput.style.cssText = "min-height:90px;padding:9px;border:1px solid #cbd6cf;border-radius:8px;resize:vertical;";
    commentLabel.append(commentInput);

    var submit = document.createElement("button");
    submit.setAttribute("data-feedbackos-submit", "true");
    submit.textContent = "Submit response";
    submit.style.cssText = "border:0;border-radius:8px;background:#15201b;color:white;font-weight:700;padding:10px;";
    var status = document.createElement("p");
    status.setAttribute("data-feedbackos-status", "true");
    status.textContent = "FeedbackOS";
    status.style.cssText = "margin:0;color:#66736c;font-size:12px;";
    body.append(scoreLabel, commentLabel, submit, status);
    shell.append(header, body);

    document.body.appendChild(shell);
    postEvent(emit("survey.displayed", { surveyId: options.surveyId || "default" }));

    close.addEventListener("click", function () {
      postEvent(emit("survey.dismissed", { surveyId: options.surveyId || "default" }));
      shell.remove();
    });

    submit.addEventListener("click", function () {
      var score = Number(scoreInput.value);
      var comment = commentInput.value;
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        status.textContent = "Enter a score from 0 to 10.";
        return;
      }
      submit.disabled = true;
      postEvent(emit("response.created", {
        surveyId: options.surveyId || "",
        score: score,
        comment: comment,
      }));
      postResponse(options.surveyId || "", score, comment).then(function (saved) {
        status.textContent = saved ? "Response captured. Thank you." : "Unable to save response. Try again.";
        submit.disabled = !saved;
        if (saved) setTimeout(function () { shell.remove(); }, 900);
      });
    });
  }

  restoreQueue();

  global.FeedbackOS = {
    init: function init(config) {
      config = config || {};
      state.apiKey = config.apiKey || config.clientKey || null;
      state.apiHost = config.apiHost || config.host || null;
      state.environmentId = config.environmentId || config.workspaceId || null;
      state.workspace = config.workspace || config.project || null;
      postEvent(emit("sdk.initialized", { environmentId: state.environmentId, workspace: state.workspace }));
      return global.FeedbackOS;
    },
    identify: function identify(userId, attributes) {
      state.userId = userId || state.userId;
      state.attributes = Object.assign({}, state.attributes, attributes || {});
      if (attributes && attributes.email) state.email = attributes.email;
      postEvent(emit("contact.identified", { userId: state.userId, attributes: state.attributes }));
      return global.FeedbackOS;
    },
    setUserId: function setUserId(userId) {
      state.userId = userId;
      postEvent(emit("contact.user_id_set", { userId: userId }));
      return global.FeedbackOS;
    },
    setEmail: function setEmail(email) {
      state.email = email;
      postEvent(emit("contact.email_set", { email: email }));
      return global.FeedbackOS;
    },
    setAttributes: function setAttributes(attributes) {
      state.attributes = Object.assign({}, state.attributes, attributes || {});
      postEvent(emit("contact.attributes_set", { attributes: state.attributes }));
      return global.FeedbackOS;
    },
    setHiddenFields: function setHiddenFields(fields) {
      state.hiddenFields = Object.assign({}, state.hiddenFields, fields || {});
      postEvent(emit("survey.hidden_fields_set", { hiddenFields: state.hiddenFields }));
      return global.FeedbackOS;
    },
    track: function track(name, properties) {
      postEvent(emit("product.event", { name: name, properties: properties || {} }));
      return global.FeedbackOS;
    },
    showSurvey: function showSurvey(options) {
      if (typeof options === "string") options = { surveyId: options };
      renderWidget(options || {});
      return global.FeedbackOS;
    },
    dismissSurvey: function dismissSurvey() {
      var widget = document.querySelector("[data-feedbackos-widget]");
      if (widget) widget.remove();
      postEvent(emit("survey.dismissed", {}));
      return global.FeedbackOS;
    },
    getWorkspaceState: function getWorkspaceState() {
      return {
        actionClasses: state.queue.filter(function (event) {
          return event.type === "product.event";
        }),
        displays: state.queue.filter(function (event) {
          return event.type === "survey.displayed";
        }),
        segments: [],
        surveys: [],
        project: {
          environmentId: state.environmentId,
          workspace: state.workspace,
        },
        recaptchaSiteKey: null,
      };
    },
    getQueue: function getQueue() {
      return state.queue.slice();
    },
    reset: function reset() {
      state.userId = null;
      state.email = null;
      state.attributes = {};
      state.hiddenFields = {};
      state.queue = [];
      persistQueue();
      return global.FeedbackOS;
    },
  };
})(window);
