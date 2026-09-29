"use strict";

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Task title is required."],
    trim: true,
    minlength: [1, "Task title cannot be empty."],
    maxlength: [100, "Task title cannot exceed 100 characters."]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [240, "Task description cannot exceed 240 characters."],
    default: ""
  },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  category: { type: String, enum: ["Study", "Work", "Fitness", "Personal", "Other"], default: "Other" },
  dueAt: { type: Date, default: null },
  rewardClaimed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);