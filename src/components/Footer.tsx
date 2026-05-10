import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-stone-100 border-t border-stone-200">
      <div className="w-full px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
        {/* Brand */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="KIDS Logo" className="h-14 w-auto object-contain" />
          </Link>
          <p className="text-stone-500 text-sm leading-relaxed">
            Kabitirtha Institute of Development &amp; Studies — dedicated to
            educational excellence and social equity since 2003.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-serif font-semibold text-primary mb-4">
            Organization
          </h4>
          <ul className="space-y-3 text-sm text-stone-500">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/projects" className="hover:text-primary transition-colors">Projects & Achievements</Link></li>
            <li><Link href="/support" className="hover:text-primary transition-colors">Join Us</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        {/* Programs */}
        <div>
          <h4 className="font-serif font-semibold text-primary mb-4">
            Programs
          </h4>
          <ul className="space-y-3 text-sm text-stone-500">
            <li><Link href="/udaan" className="hover:text-primary transition-colors">Students Evaluation Test</Link></li>
            <li><Link href="/about" className="hover:text-primary transition-colors">Teacher Training</Link></li>
            <li><Link href="/support" className="hover:text-primary transition-colors">Life Membership</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-serif font-semibold text-primary mb-4">
            Contact
          </h4>
          <address className="not-italic space-y-3 text-sm text-stone-500">
            <p>82A/H/5, Dr. Sudhir Basu Road<br />Kolkata - 700023</p>
            <p>
              <a href="tel:+919836414786" className="hover:text-primary transition-colors">+91 9836414786</a>
            </p>
            <p>
              <a href="mailto:kids.kol.org2003@gmail.com" className="hover:text-primary transition-colors">kids.kol.org2003@gmail.com</a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-stone-200 py-6 px-4 md:px-8 w-full flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-stone-500 text-sm text-center md:text-left">
          &copy; {year} Kabitirtha Institute of Development &amp; Studies. Regd. NGO. All Rights Reserved.
        </p>
        <div className="flex gap-6 text-sm text-stone-500">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
