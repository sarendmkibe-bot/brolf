
export default function Footer() {
  return (
   <footer className="relative z-10 mt-16 w-full shrink-0 border-t border-line bg-panel px-4 py-12 text-fg">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div>
          <h2 className="text-2xl font-bold text-brand">
            MarketHub<span className="text-fg">.</span>
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted">
            Connect. Trade. Grow.
            <br />
            Where connections create value and opportunities turn into growth.
          </p>

          <p className="mt-4 text-sm font-medium text-brand">
            Connection is money.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="mb-4 font-semibold">Quick Links</h3>
          <ul className="space-y-3 text-sm text-muted">
            <li><a href="/about" className="hover:text-brand">About Us</a></li>
            <li><a href="/contact" className="hover:text-brand">Contact</a></li>
            <li><a href="/privacy-policy" className="hover:text-brand">Privacy Policy</a></li>
            <li><a href="/terms" className="hover:text-brand">Terms & Conditions</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="mb-4 font-semibold">Contact Us</h3>
          <ul className="space-y-3 text-sm text-muted">
            <li>Jimma City, Ethiopia</li>
            <li>
              <a href="mailto:saremelsha@gmail.com" className="hover:text-brand">
                saremelsha@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+251912864228" className="hover:text-brand">
                +251 912 864 228
              </a>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="mb-4 font-semibold">Follow Us</h3>
          <ul className="space-y-3 text-sm text-muted">
            <li>
              <a href="https://www.instagram.com/MarketHub" target="_blank" rel="noreferrer" className="hover:text-brand">
                Instagram: @MarketHub
              </a>
            </li>
            <li>
              <a href="https://t.me/markethub1243" target="_blank" rel="noreferrer" className="hover:text-brand">
                Telegram: @markethub1243
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@markethub" target="_blank" rel="noreferrer" className="hover:text-brand">
                TikTok: @markethub
              </a>
            </li>
            <li>Facebook: #MarketHub</li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="mx-auto mt-10 max-w-6xl border-t border-line pt-6 text-center text-sm text-muted">
        © 2026 MarketHub. All rights reserved.
      </div>
    </footer>
  );
}
