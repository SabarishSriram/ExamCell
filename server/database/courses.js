const courseFaculty = require("./courseFaculty");

// Derive course list from courseFaculty.js
const courseMap = new Map();

const addCourseFromBlock = (block) => {
  if (!block || typeof block !== "object") return;
  Object.values(block).forEach((course) => {
    if (!course || typeof course !== "object") return;
    const code = course.code;
    if (!code) return;
    if (courseMap.has(code)) return;

    const name = course.name || code;
    courseMap.set(code, {
      "Course Code": code,
      "Course Name": name,
      Type: "Core",
    });
  });
};

addCourseFromBlock(courseFaculty.I_YEAR);
addCourseFromBlock(courseFaculty.II_YEAR);
addCourseFromBlock(courseFaculty.III_YEAR);

const courses = Array.from(courseMap.values());

module.exports = courses;
