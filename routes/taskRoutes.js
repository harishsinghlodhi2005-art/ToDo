"use strict";

const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");

const router = express.Router();
const editableFields = ["title", "description", "completed", "completedAt", "difficulty", "priority", "category", "dueAt", "rewardClaimed"];
const allowedValues = {
  difficulty: ["Easy", "Medium", "Hard"],
  priority: ["Low", "Medium", "High"],
  category: ["Study", "Work", "Fitness", "Personal", "Other"]
};

function validateTaskInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "Request body must be a JSON object.";
  }

  const unknownFields = Object.keys(input).filter(field => !editableFields.includes(field));
  if (unknownFields.length) return `Unsupported task field: ${unknownFields[0]}.`;
  if (!partial && (typeof input.title !== "string" || !input.title.trim())) return "Task title is required.";

  for (const field of Object.keys(input)) {
    const value = input[field];
    if (field === "title" && (typeof value !== "string" || !value.trim() || value.trim().length > 100)) {
      return "Task title must contain 1 to 100 characters.";
    }
    if (field === "description" && (typeof value !== "string" || value.length > 240)) {
      return "Task description must be a string of at most 240 characters.";
    }
    if (field === "completed" && typeof value !== "boolean") return "Completed must be true or false.";
    if (field === "rewardClaimed" && typeof value !== "boolean") return "Reward claimed must be true or false.";
    if (field === "completedAt" && value !== null && (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) {
      return "Completed date must be a valid date or null.";
    }
    if (field === "dueAt" && value !== null && (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) {
      return "Due date must be a valid date or null.";
    }
    if (allowedValues[field] && !allowedValues[field].includes(value)) {
      return `${field} must be one of: ${allowedValues[field].join(", ")}.`;
    }
  }
  return null;
}

function sendValidationError(res, message) {
  return res.status(400).json({ error: message });
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function handleRouteError(res, error) {
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: error.message });
  }
  console.error("Task API failed:", error);
  return res.status(500).json({ error: "Unable to complete the task request." });
}

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return res.json({ tasks });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", async (req, res) => {
  const validationError = validateTaskInput(req.body);
  if (validationError) return sendValidationError(res, validationError);

  try {
    const task = await Task.create(req.body);
    return res.status(201).json({ task });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });
  const validationError = validateTaskInput(req.body, { partial: true });
  if (validationError) return sendValidationError(res, validationError);
  if (!Object.keys(req.body || {}).length) return sendValidationError(res, "Provide at least one task field to update.");

  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!task) return res.status(404).json({ error: "Task not found." });
    return res.json({ task });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid task ID." });

  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found." });
    return res.json({ message: "Task deleted successfully.", task });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;