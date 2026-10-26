/**
 * Idempotent demo seed for Nextdemy.
 *
 * Usage:
 *   SEED_INSTRUCTOR_PASSWORD='choose-a-strong-password' bun run seed
 *
 * The script only inserts missing documents and uses $addToSet/$setOnInsert;
 * it never deletes or overwrites existing users, courses, or reviews.
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/configs/db";
import env from "@/configs/env";
import User from "@/modules/auth/models/user.model";
import Category from "@/modules/course/models/category-model";
import Course from "@/modules/course/models/course-model";
import CourseProgress from "@/modules/course/models/course-progress-model";
import RatingAndReview from "@/modules/course/models/rating-and-review-model";
import Section from "@/modules/course/models/section-model";
import SubSection from "@/modules/course/models/sub-section-model";
import Profile from "@/modules/profile/models/profile.model";

const INSTRUCTOR_EMAIL = (
  process.env.SEED_INSTRUCTOR_EMAIL ?? "amjad@nextdemy.dev"
)
  .trim()
  .toLowerCase();

const INSTRUCTOR_PASSWORD =
  process.env.SEED_INSTRUCTOR_PASSWORD ?? crypto.randomBytes(24).toString("base64url");

const DEMO_PASSWORD = crypto.randomBytes(24).toString("base64url");

const DEMO_STUDENTS = [
  { firstName: "Omar", lastName: "Hassan", email: "omar.hassan@demo.nextdemy.local" },
  { firstName: "Nour", lastName: "Adel", email: "nour.adel@demo.nextdemy.local" },
  { firstName: "Youssef", lastName: "Khaled", email: "youssef.khaled@demo.nextdemy.local" },
  { firstName: "Salma", lastName: "Tarek", email: "salma.tarek@demo.nextdemy.local" },
  { firstName: "Karim", lastName: "Mostafa", email: "karim.mostafa@demo.nextdemy.local" },
] as const;

const DEMO_REVIEWS = [
  { rating: 5, review: "Clear explanations and a real project at the end. Exactly what I needed." },
  { rating: 5, review: "The architecture decisions are explained, not just the syntax. Great depth." },
  { rating: 4, review: "Practical, well paced, and easy to follow alongside a full-time job." },
] as const;

const CATEGORIES = [
  { name: "Web Development", slug: "web-development", description: "Modern frontend and full-stack engineering." },
  { name: "Backend Engineering", slug: "backend-engineering", description: "APIs, databases, and server-side architecture." },
  { name: "Cloud & DevOps", slug: "cloud-devops", description: "Ship and operate applications with confidence." },
  { name: "Data & Databases", slug: "data-databases", description: "Model, query, and scale application data." },
  { name: "Career Skills", slug: "career-skills", description: "Tools and habits that make engineers effective." },
] as const;

interface SeedCourse {
  courseName: string;
  courseDescription: string;
  whatYouWillLearn: string;
  price: number;
  tag: string[];
  categorySlug: string;
  thumbnail: string;
  sections: { sectionName: string; lectures: { title: string; description: string; duration: string; video: string }[] }[];
}

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];

const COURSES: SeedCourse[] = [
  {
    courseName: "Full-Stack Web Development with Next.js",
    courseDescription:
      "Build a production-ready full-stack application with Next.js, TypeScript, authentication, and a real database.",
    whatYouWillLearn:
      "Build server-rendered and streaming UIs with the App Router\nDesign typed API layers with TypeScript\nImplement secure authentication and session handling\nDeploy a full-stack application",
    price: 1499,
    tag: ["nextjs", "react", "fullstack"],
    categorySlug: "web-development",
    thumbnail:
      "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "Foundations",
        lectures: [
          { title: "Course overview and project preview", description: "What we are building and how the course is structured.", duration: "420", video: SAMPLE_VIDEOS[0] },
          { title: "App Router mental model", description: "Server components, layouts, and routing in Next.js.", duration: "640", video: SAMPLE_VIDEOS[1] },
        ],
      },
      {
        sectionName: "Data and authentication",
        lectures: [
          { title: "Typed data access", description: "A clean boundary between the UI and the database.", duration: "720", video: SAMPLE_VIDEOS[2] },
          { title: "Sessions and protected routes", description: "Secure cookies, refresh tokens, and authorization.", duration: "580", video: SAMPLE_VIDEOS[3] },
        ],
      },
    ],
  },
  {
    courseName: "TypeScript for Production Applications",
    courseDescription:
      "Go beyond basic types: model real domains, validate boundaries, and keep large codebases safe to change.",
    whatYouWillLearn:
      "Model domain types that survive refactors\nValidate untrusted input with Zod\nUse generics without over-engineering\nAdopt strict compiler settings safely",
    price: 999,
    tag: ["typescript", "architecture", "javascript"],
    categorySlug: "web-development",
    thumbnail:
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "Types that model reality",
        lectures: [
          { title: "Discriminated unions", description: "Make impossible states impossible.", duration: "510", video: SAMPLE_VIDEOS[1] },
          { title: "Validation at the boundary", description: "Parse, do not trust, external data.", duration: "620", video: SAMPLE_VIDEOS[2] },
        ],
      },
      {
        sectionName: "Scaling a codebase",
        lectures: [
          { title: "Strict mode migration", description: "A practical path from loose to strict typing.", duration: "700", video: SAMPLE_VIDEOS[4] },
          { title: "Designing public APIs", description: "Exports, generics, and backwards compatibility.", duration: "560", video: SAMPLE_VIDEOS[0] },
        ],
      },
    ],
  },
  {
    courseName: "Node.js and Express API Engineering",
    courseDescription:
      "Design maintainable REST APIs with Express, MongoDB, validation, authentication, and production-grade error handling.",
    whatYouWillLearn:
      "Structure a modular Express application\nValidate requests and centralize errors\nImplement JWT access and refresh tokens\nWrite safe, idempotent business operations",
    price: 1199,
    tag: ["nodejs", "express", "api"],
    categorySlug: "backend-engineering",
    thumbnail:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "API foundations",
        lectures: [
          { title: "Routing and middleware", description: "A request pipeline you can reason about.", duration: "500", video: SAMPLE_VIDEOS[2] },
          { title: "Schemas and validation", description: "Zod at every input boundary.", duration: "610", video: SAMPLE_VIDEOS[3] },
        ],
      },
      {
        sectionName: "Production concerns",
        lectures: [
          { title: "Authentication and roles", description: "Protecting routes without leaking details.", duration: "680", video: SAMPLE_VIDEOS[4] },
          { title: "Idempotency and race conditions", description: "Making critical writes safe to retry.", duration: "740", video: SAMPLE_VIDEOS[0] },
        ],
      },
    ],
  },
  {
    courseName: "MongoDB Data Modeling",
    courseDescription:
      "Learn how to model real application data with Mongoose, choose the right indexes, and keep queries fast.",
    whatYouWillLearn:
      "Model one-to-many and many-to-many relationships\nDesign compound indexes for real queries\nAvoid unbounded documents and duplicated data\nDebug slow queries with explain plans",
    price: 799,
    tag: ["mongodb", "mongoose", "database"],
    categorySlug: "data-databases",
    thumbnail:
      "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "Modeling",
        lectures: [
          { title: "Documents vs references", description: "Choosing a shape that matches access patterns.", duration: "560", video: SAMPLE_VIDEOS[3] },
          { title: "Schema design workshop", description: "A course platform modeled end to end.", duration: "700", video: SAMPLE_VIDEOS[4] },
        ],
      },
      {
        sectionName: "Performance",
        lectures: [
          { title: "Indexes that matter", description: "Compound indexes, selectivity, and the ESR rule.", duration: "640", video: SAMPLE_VIDEOS[0] },
          { title: "Query diagnostics", description: "Reading explain output and fixing hotspots.", duration: "590", video: SAMPLE_VIDEOS[1] },
        ],
      },
    ],
  },
  {
    courseName: "Docker and Cloud Deployment",
    courseDescription:
      "Package an application, ship it to a cloud platform, and understand what happens after the deploy button.",
    whatYouWillLearn:
      "Write small, reproducible Docker images\nSeparate build-time and runtime configuration\nRun health checks and read production logs\nSet up a free-tier deployment pipeline",
    price: 1299,
    tag: ["docker", "devops", "deployment"],
    categorySlug: "cloud-devops",
    thumbnail:
      "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "Containers",
        lectures: [
          { title: "A production Dockerfile", description: "Caching, non-root users, and a small final image.", duration: "620", video: SAMPLE_VIDEOS[1] },
          { title: "Local composition", description: "Running the app and database together.", duration: "560", video: SAMPLE_VIDEOS[2] },
        ],
      },
      {
        sectionName: "Shipping",
        lectures: [
          { title: "Deploying the API", description: "Environment variables, health checks, and logs.", duration: "700", video: SAMPLE_VIDEOS[3] },
          { title: "Deploying the frontend", description: "Build settings, rewrites, and preview deployments.", duration: "650", video: SAMPLE_VIDEOS[4] },
        ],
      },
    ],
  },
  {
    courseName: "React Performance and Architecture",
    courseDescription:
      "Profile React applications, remove unnecessary work, and structure features that stay fast as they grow.",
    whatYouWillLearn:
      "Measure before optimizing\nSplit server and client state correctly\nReduce re-renders with better component boundaries\nDesign feature modules that scale",
    price: 1399,
    tag: ["react", "performance", "frontend"],
    categorySlug: "web-development",
    thumbnail:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "Measuring",
        lectures: [
          { title: "The React profiler", description: "Finding the components that actually cost you.", duration: "580", video: SAMPLE_VIDEOS[4] },
          { title: "Network and bundle budgets", description: "What ships to the browser and why.", duration: "640", video: SAMPLE_VIDEOS[0] },
        ],
      },
      {
        sectionName: "Architecture",
        lectures: [
          { title: "State ownership", description: "Server state, URL state, and local state.", duration: "700", video: SAMPLE_VIDEOS[1] },
          { title: "Feature boundaries", description: "Organizing code around user outcomes.", duration: "620", video: SAMPLE_VIDEOS[2] },
        ],
      },
    ],
  },
  {
    courseName: "Git and GitHub Essentials",
    courseDescription:
      "A free, practical introduction to version control, branching, pull requests, and collaborating without fear.",
    whatYouWillLearn:
      "Understand commits, branches, and merges\nRecover from common mistakes safely\nOpen a focused pull request\nCollaborate on a shared repository",
    price: 0,
    tag: ["git", "github", "free"],
    categorySlug: "career-skills",
    thumbnail:
      "https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1200&q=80",
    sections: [
      {
        sectionName: "The basics",
        lectures: [
          { title: "Your first repository", description: "Commits, history, and the staging area.", duration: "430", video: SAMPLE_VIDEOS[2] },
          { title: "Branching and merging", description: "A mental model for parallel work.", duration: "560", video: SAMPLE_VIDEOS[3] },
        ],
      },
      {
        sectionName: "Working with others",
        lectures: [
          { title: "Pull requests", description: "Small changes, clear descriptions, useful reviews.", duration: "520", video: SAMPLE_VIDEOS[4] },
          { title: "Fixing mistakes", description: "Reset, revert, and restore without panic.", duration: "600", video: SAMPLE_VIDEOS[0] },
        ],
      },
    ],
  },
];

const avatarFor = (firstName: string, lastName: string) =>
  `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(
    `${firstName} ${lastName}`
  )}`;

const ensureInstructor = async () => {
  const existing = await User.findOne({ email: INSTRUCTOR_EMAIL });
  if (existing) {
    if (existing.accountType !== "Instructor") {
      throw new Error(
        `SEED_INSTRUCTOR_EMAIL (${INSTRUCTOR_EMAIL}) belongs to a non-instructor account`
      );
    }
    return existing;
  }

  const profile = await Profile.create({
    about:
      "Software engineer building production web applications with TypeScript, Node.js, and modern cloud tooling.",
    contactNumber: null,
    dateOfBirth: null,
    gender: null,
  });

  const user = await User.create({
    firstName: "Amjad",
    lastName: "Ibrahim",
    email: INSTRUCTOR_EMAIL,
    password: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
    accountType: "Instructor",
    approved: true,
    additionalDetails: profile._id,
    image: avatarFor("Amjad", "Ibrahim"),
  });

  console.log(`Created instructor ${INSTRUCTOR_EMAIL}`);
  return user;
};

const ensureDemoStudents = async () => {
  const students = [];
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const student of DEMO_STUDENTS) {
    let user = await User.findOne({ email: student.email });
    if (!user) {
      const profile = await Profile.create({
        about: null,
        contactNumber: null,
        dateOfBirth: null,
        gender: null,
      });
      user = await User.create({
        ...student,
        password: passwordHash,
        accountType: "Student",
        approved: true,
        additionalDetails: profile._id,
        image: avatarFor(student.firstName, student.lastName),
      });
    }
    students.push(user);
  }

  return students;
};

const ensureCategories = async () => {
  const categories = new Map<string, mongoose.Types.ObjectId>();

  for (const category of CATEGORIES) {
    const document = await Category.findOneAndUpdate(
      { slug: category.slug },
      {
        $setOnInsert: {
          name: category.name,
          slug: category.slug,
          description: category.description,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categories.set(category.slug, document._id);
  }

  return categories;
};

const ensureCourse = async (
  definition: SeedCourse,
  instructorId: mongoose.Types.ObjectId,
  categoryId: mongoose.Types.ObjectId,
  students: { _id: mongoose.Types.ObjectId }[]
) => {
  let course = await Course.findOne({ courseName: definition.courseName });

  if (!course) {
    course = await Course.create({
      courseName: definition.courseName,
      courseDescription: definition.courseDescription,
      whatYouWillLearn: definition.whatYouWillLearn,
      price: definition.price,
      tag: definition.tag,
      category: categoryId,
      instructor: instructorId,
      thumbnail: definition.thumbnail,
      status: "Published",
      instructions: [
        "Basic familiarity with JavaScript is helpful",
        "A computer with Node.js installed",
      ],
      studentsEnrolled: [],
      ratingAndReviews: [],
      courseContent: [],
    });
    console.log(`Created course ${definition.courseName}`);
  }

  if ((course.courseContent ?? []).length === 0) {
    const sectionIds: mongoose.Types.ObjectId[] = [];

    for (const sectionDefinition of definition.sections) {
      const subsectionIds = [];
      for (const lecture of sectionDefinition.lectures) {
        const subsection = await SubSection.create({
          title: lecture.title,
          description: lecture.description,
          timeDuration: lecture.duration,
          videoUrl: lecture.video,
        });
        subsectionIds.push(subsection._id);
      }

      const section = await Section.create({
        sectionName: sectionDefinition.sectionName,
        subSection: subsectionIds,
      });
      sectionIds.push(section._id);
    }

    course.courseContent = sectionIds;
    await course.save();
  }

  // Add demo students and reviews without duplicating existing entries.
  for (let index = 0; index < students.length; index++) {
    const student = students[index];
    const reviewDefinition = DEMO_REVIEWS[index % DEMO_REVIEWS.length];

    await Course.updateOne(
      { _id: course._id },
      { $addToSet: { studentsEnrolled: student._id } }
    );
    await CourseProgress.updateOne(
      { user: student._id, course: course._id },
      { $setOnInsert: { user: student._id, course: course._id } },
      { upsert: true }
    );

    const review = await RatingAndReview.findOneAndUpdate(
      { user: student._id, course: course._id },
      {
        $setOnInsert: {
          user: student._id,
          course: course._id,
          rating: reviewDefinition.rating,
          review: reviewDefinition.review,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Course.updateOne(
      { _id: course._id },
      { $addToSet: { ratingAndReviews: review._id } }
    );
  }

  await Category.updateOne(
    { _id: categoryId },
    { $addToSet: { courses: course._id } }
  );

  return course;
};

const run = async () => {
  console.log(`Seeding ${env.NODE_ENV} database (no deletes, no overwrites)`);
  await connectDB();

  const instructor = await ensureInstructor();
  const students = await ensureDemoStudents();
  const categories = await ensureCategories();

  for (const definition of COURSES) {
    const categoryId = categories.get(definition.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category ${definition.categorySlug}`);
    }
    await ensureCourse(
      definition,
      instructor._id as mongoose.Types.ObjectId,
      categoryId,
      students
    );
  }

  console.log(
    `Seed complete: ${COURSES.length} courses, ${CATEGORIES.length} categories, ${students.length} demo students`
  );
};

run()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
