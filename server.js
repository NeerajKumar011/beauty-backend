require('dotenv').config({ path: './.env' });
const Availability =
  require("./models/Availability");
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const auth = require('./middleware/auth');
const admin = require('./middleware/admin');

const User = require('./models/User');
const Service = require('./models/Service');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const multer =
  require("multer");

const {
  CloudinaryStorage,
} = require(
  "multer-storage-cloudinary"
);

const cloudinary =
  require("./config/cloudinary");

const Gallery =
  require("./models/Gallery");

const app = express();
app.use(
  cors({
    origin:
      process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

mongoose.connect(
  process.env.MONGO_URI,
  {
    autoIndex: true,
  }
)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const storage =
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder:
        "neha-gallery",
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "webp",
      ],
    },
  });

const upload =
  multer({
    storage,
  });

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => res.send('API is running'));

/* AUTH */
app.post('/signup', asyncHandler(async (req, res) => {
  let { name, email, password } =
  req.body;

name = name?.trim();
email = email?.trim().toLowerCase();
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password too short' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role: 'user' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.json({ message: 'Signup successful', token, user });
}));



app.post(
  "/login",
  asyncHandler(
    async (req, res) => {
      let {
        email,
        password,
      } = req.body;

      email =
        email
          ?.trim()
          .toLowerCase();

      /* Check input */
      if (
        !email ||
        !password
      ) {
        return res
          .status(400)
          .json({
            message:
              "Email and password required",
          });
      }

      /* Find user */
      const user =
        await User.findOne({
          email,
        });

      if (!user) {
        return res
          .status(401)
          .json({
            message:
              "Invalid email",
          });
      }

      /* Broken account check */
      if (
        !user.password
      ) {
        return res
          .status(500)
          .json({
            message:
              "Account password missing. Please signup again.",
          });
      }

      /* Compare password */
      const match =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!match) {
        return res
          .status(401)
          .json({
            message:
              "Invalid password",
          });
      }

      /* Blocked check */
      if (
        user.isBlocked
      ) {
        return res
          .status(403)
          .json({
            message:
              "Your account has been blocked. Contact admin.",
          });
      }

      /* Token */
      const token =
        jwt.sign(
          {
            id: user._id,
            role:
              user.role,
          },
          process.env.JWT_SECRET,
          {
            expiresIn:
              "7d",
          }
        );

      res.json({
        token,
        user,
      });
    }
  )
);

/* PASSWORD RESET */
app.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'Account not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000;
  await user.save();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP is ${otp}`,
  });

  res.json({ message: 'OTP sent successfully' });
}));

app.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (user.otpExpiry < Date.now()) return res.status(400).json({ message: 'OTP expired' });

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = '';
  user.otpExpiry = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
}));

/* SERVICES */
app.get('/services', asyncHandler(async (req, res) => {
  res.json(await Service.find());
}));

app.post('/services', auth, admin, asyncHandler(async (req, res) => {
  res.json(await Service.create(req.body));
}));

app.put('/services/:id', auth, admin, asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ message: 'Service updated', service });
}));

app.delete('/services/:id', auth, admin, asyncHandler(async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
}));

/* BOOKINGS */
/* BOOKINGS */
/* =====================================
   BOOKINGS
===================================== */
app.post(
  "/bookings",
  auth,
  asyncHandler(
    async (
      req,
      res
    ) => {
      const {
        name,
        service,
        date,
        time,
      } = req.body;

      /* =====================
         REQUIRED FIELDS
      ===================== */
      if (
        !name ||
        !service ||
        !date ||
        !time
      ) {
        return res
          .status(400)
          .json({
            message:
              "All booking fields required",
          });
      }

      /* =====================
         GET AVAILABILITY
      ===================== */
      let settings =
        await Availability.findOne();

      if (!settings) {
        settings =
          await Availability.create(
            {}
          );
      }

      /* =====================
         DAY NAME
      ===================== */
      const selectedDate =
        new Date(
          date
        );

      const dayName =
        selectedDate.toLocaleDateString(
          "en-US",
          {
            weekday:
              "long",
          }
        );

      /* =====================
         CLOSED WEEKLY DAY
      ===================== */
      if (
        settings.closedDays.includes(
          dayName
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Salon closed on selected day",
          });
      }

      /* =====================
         CLOSED CUSTOM DATE
      ===================== */
      if (
        settings.closedDates.includes(
          date
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Salon closed on selected date",
          });
      }

      /* =====================
         TIME VALIDATION
      ===================== */
      const selectedMinutes =
        Number(
          time.split(
            ":"
          )[0]
        ) *
          60 +
        Number(
          time.split(
            ":"
          )[1]
        );

      const openMinutes =
        Number(
          settings.openTime.split(
            ":"
          )[0]
        ) *
          60 +
        Number(
          settings.openTime.split(
            ":"
          )[1]
        );

      const closeMinutes =
        Number(
          settings.closeTime.split(
            ":"
          )[0]
        ) *
          60 +
        Number(
          settings.closeTime.split(
            ":"
          )[1]
        );

      if (
        selectedMinutes <
          openMinutes ||
        selectedMinutes >=
          closeMinutes
      ) {
        return res
          .status(400)
          .json({
            message:
              "Salon is closed at selected time",
          });
      }

      /* =====================
         TODAY PAST TIME BLOCK
      ===================== */
      const today =
        new Date()
          .toISOString()
          .split(
            "T"
          )[0];

      if (
        date ===
        today
      ) {
        const now =
          new Date();

        const currentMinutes =
          now.getHours() *
            60 +
          now.getMinutes();

        if (
          selectedMinutes <=
          currentMinutes
        ) {
          return res
            .status(400)
            .json({
              message:
                "Selected time already passed",
            });
        }
      }

      /* =====================
         MAX BOOKINGS PER DAY
      ===================== */
      const dayCount =
        await Booking.countDocuments(
          {
            date,
          }
        );

      if (
        dayCount >=
        settings.maxBookingsPerDay
      ) {
        return res
          .status(400)
          .json({
            message:
              "Bookings full for this day",
          });
      }

      /* =====================
         DUPLICATE SLOT BLOCK
      ===================== */
      const slotExists =
        await Booking.findOne(
          {
            date,
            time,
          }
        );

      if (
        slotExists
      ) {
        return res
          .status(400)
          .json({
            message:
              "This time slot is already booked",
          });
      }

      /* =====================
         CREATE BOOKING
      ===================== */
      const booking =
        await Booking.create(
          {
            name,
            service,
            date,
            time,
            userId:
              req.user.id,
            status:
              "Pending",
          }
        );

      /* =====================
         EMAIL SAFE MODE
      ===================== */
      try {
        const user =
          await User.findById(
            req.user.id
          );

        if (
          user?.email
        ) {
          await transporter.sendMail(
            {
              from: process.env.EMAIL_USER,
              to: user.email,
              subject:
                "Booking Confirmed",
              text: `Your appointment for ${service} on ${date} at ${time} has been confirmed.`,
            }
          );
        }
      } catch (
        err
      ) {
        console.log(
          "Email failed:",
          err.message
        );
      }

      /* =====================
         SUCCESS
      ===================== */
      res.json({
        message:
          "Booking successful",
        booking,
      });
    }
  )
);

app.get('/bookings/:userId', auth, asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.json(await Booking.find({ userId: req.params.userId }));
}));

app.get('/bookings', auth, admin, asyncHandler(async (req, res) => {
  res.json(await Booking.find());
}));

app.put('/bookings/:id/status', auth, admin, asyncHandler(async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({ message: 'Status updated' });
}));

app.delete('/bookings/:id', auth, admin, asyncHandler(async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.json({ message: 'Booking deleted' });
}));

/* USERS */

app.get(
  "/users",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      const users =
        await User.find({
          role: {
            $ne:
              "admin",
          },
        })
          .select(
            "-password"
          )
          .sort({
            createdAt:
              -1,
          });

      const usersWithCounts =
        await Promise.all(
          users.map(
            async (
              user
            ) => {
              const count =
                await Booking.countDocuments(
                  {
                    userId:
                      user._id,
                  }
                );

              return {
                ...user.toObject(),
                bookingsCount:
                  count,
              };
            }
          )
        );

      res.json(
        usersWithCounts
      );
    }
  )
);

/* BLOCK USER */
app.put(
  "/users/:id/block",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      await User.findByIdAndUpdate(
        req.params.id,
        {
          isBlocked:
            true,
        }
      );

      res.json({
        message:
          "User blocked",
      });
    }
  )
);

/* UNBLOCK USER */
app.put(
  "/users/:id/unblock",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      await User.findByIdAndUpdate(
        req.params.id,
        {
          isBlocked:
            false,
        }
      );

      res.json({
        message:
          "User unblocked",
      });
    }
  )
);

/* DELETE USER */
app.delete(
  "/users/:id",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      await User.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "User deleted",
      });
    }
  )
);

/* REVIEWS */

/* Public Reviews */
app.get(
  "/reviews",
  asyncHandler(
    async (req, res) => {
      const data =
        await Review.find()
          .sort({
            featured: -1,
            createdAt: -1,
          });

      res.json(data);
    }
  )
);

/* Submit Review */
app.post(
  "/reviews",
  asyncHandler(
    async (req, res) => {
      let {
        name,
        rating,
        message,
      } = req.body;

      name = name?.trim();
      message = message?.trim();
      rating = Number(rating);

      if (
        !name ||
        !message ||
        !rating
      ) {
        return res.status(400).json({
          message:
            "All review fields required",
        });
      }

      if (
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          message:
            "Rating must be 1 to 5",
        });
      }

      const review =
        await Review.create({
          name,
          rating,
          message,
        });

      res.json({
        message:
          "Review submitted",
        review,
      });
    }
  )
);

/* Admin Reviews */
app.get(
  "/admin/reviews",
  auth,
  admin,
  asyncHandler(
    async (req, res) => {
      const reviews =
        await Review.find().sort({
          createdAt: -1,
        });

      res.json(reviews);
    }
  )
);

/* Feature Toggle */
app.put(
  "/reviews/:id/feature",
  auth,
  admin,
  asyncHandler(
    async (req, res) => {
      const review =
        await Review.findById(
          req.params.id
        );

      if (!review) {
        return res.status(404).json({
          message:
            "Review not found",
        });
      }

      review.featured =
        !review.featured;

      await review.save();

      res.json({
        message:
          "Review updated",
        review,
      });
    }
  )
);

/* Update Review */
app.put(
  "/reviews/:id",
  auth,
  admin,
  asyncHandler(
    async (req, res) => {
      const updated =
        await Review.findByIdAndUpdate(
          req.params.id,
          {
            name:
              req.body.name?.trim(),
            rating:
              Number(
                req.body.rating
              ) || 5,
            message:
              req.body.message?.trim(),
          },
          { new: true }
        );

      res.json({
        message:
          "Review updated",
        updated,
      });
    }
  )
);

/* Delete Review */
app.delete(
  "/reviews/:id",
  auth,
  admin,
  asyncHandler(
    async (req, res) => {
      await Review.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "Review deleted",
      });
    }
  )
);

/*gallery */

app.get(
  "/gallery",
  asyncHandler(
    async (req, res) => {
      const data =
        await Gallery.find()
          .sort({
            createdAt: -1,
          });

      res.json(data);
    }
  )
);

app.post(
  "/gallery",
  auth,
  admin,
  upload.single("image"),
  asyncHandler(
    async (req, res) => {
      const photo =
        await Gallery.create({
          imageUrl:
            req.file.path,

          publicId:
            req.file.filename,

          title:
            req.body.title ||
            "",

          category:
            req.body.category ||
            "General",
        });

      res.json({
        message:
          "Photo uploaded",
        photo,
      });
    }
  )
);

app.delete(
  "/gallery/:id",
  auth,
  admin,
  asyncHandler(
    async (req, res) => {
      const item =
        await Gallery.findById(
          req.params.id
        );

      if (!item) {
        return res.status(404).json({
          message:
            "Photo not found",
        });
      }

      await cloudinary.uploader.destroy(
        item.publicId
      );

      await Gallery.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "Photo deleted",
      });
    }
  )
);

/*public assets */

app.get(
  "/public-stats",
  asyncHandler(
    async (req, res) => {
      const totalUsers =
        await User.countDocuments();

      const reviews =
        await Review.find();

      const availability =
        await Availability.findOne();

      const avgRating =
        reviews.length
          ? (
              reviews.reduce(
                (sum, r) =>
                  sum +
                  Number(
                    r.rating || 0
                  ),
                0
              ) /
              reviews.length
            ).toFixed(1)
          : "5.0";

      const satisfied =
        reviews.length
          ? Math.round(
              (reviews.filter(
                (r) =>
                  Number(
                    r.rating
                  ) >= 4
              ).length /
                reviews.length) *
                100
            )
          : 100;

      const openDays =
        7 -
        (
          availability
            ?.closedDays
            ?.length || 0
        );

      res.json({
        avgRating,
        happyCustomers:
          totalUsers,
        satisfaction:
          satisfied,
        openDays,
      });
    }
  )
);

/* DASHBOARD */
app.get('/dashboard/summary', auth, admin, asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalBookings = await Booking.countDocuments();
  const totalServices = await Service.countDocuments();
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = await Booking.countDocuments({ date: today });

  res.json({ totalUsers, totalBookings, totalServices, todayBookings });
}));

/* ANALYTICS */
app.get('/analytics/summary', auth, admin, asyncHandler(async (req, res) => {
  const bookings = await Booking.find();
  const reviews = await Review.find();

  const totalBookings = bookings.length;
  const completed = bookings.filter(b => b.status === 'Completed').length;
  const pending = bookings.filter(b => !b.status || b.status === 'Pending').length;
  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0';

  const counts = {};
  bookings.forEach(b => {
    counts[b.service] = (counts[b.service] || 0) + 1;
  });

  const services = Object.keys(counts).map(name => ({ name, count: counts[name] }));

  res.json({ totalBookings, completed, pending, avgRating, services });
}));

/* =====================================
   GET SALON AVAILABILITY
===================================== */
app.get(
  "/availability",
  asyncHandler(
    async (
      req,
      res
    ) => {
      let settings =
        await Availability.findOne();

      if (!settings) {
        settings =
          await Availability.create(
            {}
          );
      }

      res.json(
        settings
      );
    }
  )
);

/* =====================================
   ADMIN UPDATE AVAILABILITY
===================================== */
app.put(
  "/availability",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      let settings =
        await Availability.findOne();

      if (!settings) {
        settings =
          await Availability.create(
            {}
          );
      }

      settings.closedDays =
        req.body.closedDays ||
        [];

      settings.closedDates =
        req.body.closedDates ||
        [];

      settings.openTime =
  req.body.openTime?.trim() ||
  "11:00";

      settings.closeTime =
  req.body.closeTime?.trim() ||
  "05:00";
        settings.slotMinutes =
 Number(req.body.slotMinutes) || 30;

      settings.maxBookingsPerDay =
  Number(
    req.body.maxBookingsPerDay
  ) || 20;

      await settings.save();

      res.json({
        message:
          "Availability updated",
        settings,
      });
    }
  )
);

/* =====================================
   BOOKINGS BY DATE
===================================== */
app.get(
  "/bookings/date/:date",
  auth,
  admin,
  asyncHandler(
    async (
      req,
      res
    ) => {
      const bookings =
        await Booking.find(
          {
            date:
              req.params
                .date,
          }
        ).sort({
          time: 1,
        });

      res.json(
        bookings
      );
    }
  )
);

/* GLOBAL ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(
  "Global Error:",
  err.message
);
  res.status(err.status || 500).json({
    message: err.message || 'Server Error',
  });
});

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});