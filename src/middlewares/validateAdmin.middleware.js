export const validateAdmin = (req, res, next) => {
  const {
    email,
    password,
    first_name,
    middle_name,
    last_name,
    contact_number
  } = req.body;

  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password too short' });
  }

  if (!first_name) errors.push({ field: 'first_name', message: 'First name required' });
  if (!last_name) errors.push({ field: 'last_name', message: 'Last name required' });
  if (!contact_number) errors.push({ field: 'contact_number', message: 'Contact number required' });

  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};
