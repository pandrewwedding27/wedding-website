:root {
  --sage-900: #2f3f34;
  --sage-700: #4d6554;
  --sage-500: #7d9975;
  --sage-300: #cad9c6;
  --sage-200: #edf3eb;
  --gold-500: #c9a55a;
  --gold-300: #f2dfaa;
  --ivory: #f7f3ee;
  --ink: #233127;
  --white: #ffffff;
  --shadow: rgba(34, 48, 39, 0.12);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  background: var(--ivory);
  color: var(--ink);
  line-height: 1.7;
}

img {
  max-width: 100%;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

.container {
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
}

.section-spacing {
  padding: 5rem 0;
}

.section-label {
  font-size: 0.8rem;
  letter-spacing: 0.18rem;
  text-transform: uppercase;
  color: var(--sage-700);
  margin-bottom: 0.75rem;
}

h1, h2, h3 {
  font-family: "Cormorant Garamond", serif;
  line-height: 1.05;
  margin: 0 0 1rem;
  font-weight: 600;
}

h1 {
  font-size: clamp(3rem, 6vw, 6rem);
}

h2 {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
}

h3 {
  font-size: clamp(1.8rem, 2.5vw, 2.3rem);
}

p {
  margin: 0 0 1rem;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(247, 243, 238, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(47, 63, 52, 0.08);
}

.nav-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 76px;
  gap: 1rem;
}

.brand {
  font-family: "Cormorant Garamond", serif;
  font-size: 2rem;
  letter-spacing: 0.08rem;
  font-weight: 700;
  color: var(--sage-900);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.site-nav a {
  font-size: 0.95rem;
  color: var(--sage-900);
  position: relative;
}

.site-nav a.active::after,
.site-nav a:hover::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.35rem;
  height: 2px;
  background: var(--gold-500);
}

.nav-button,
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.8rem 1.5rem;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-button,
.button.primary {
  background: var(--sage-700);
  color: var(--white);
  box-shadow: 0 12px 24px rgba(77, 101, 84, 0.25);
}

.button.secondary {
  background: transparent;
  border: 1px solid rgba(47, 63, 52, 0.2);
  color: var(--sage-900);
}

.nav-button:hover,
.button:hover {
  transform: translateY(-1px);
}

.nav-toggle {
  display: none;
  background: transparent;
  border: 1px solid rgba(47, 63, 52, 0.2);
  border-radius: 10px;
  font-size: 1.3rem;
  padding: 0.5rem 0.7rem;
}

.hero {
  position: relative;
  background-image: url("https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1600&q=80");
  background-size: cover;
  background-position: center;
  min-height: 720px;
  display: flex;
  align-items: center;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(25, 34, 30, 0.7), rgba(25, 34, 30, 0.25));
}

.hero-content {
  position: relative;
  color: var(--white);
  padding: 4rem 0;
}

.eyebrow {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  letter-spacing: 0.18rem;
  text-transform: uppercase;
}

.date-line {
  font-size: clamp(1.1rem, 1.6vw, 1.75rem);
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
}

.cards-grid {
  display: grid;
  gap: 1.5rem;
}

.three-up {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-card {
  background: var(--white);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 22px;
  box-shadow: 0 18px 40px var(--shadow);
  padding: 2rem 1.5rem;
}

.card-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--sage-200);
  color: var(--sage-700);
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.info-card a {
  color: var(--sage-700);
  font-weight: 600;
}

.section-heading {
  text-align: center;
  margin-bottom: 2rem;
}

.left-aligned {
  text-align: left;
}

.accent-panel {
  background: linear-gradient(120deg, rgba(205, 220, 194, 0.5), rgba(242, 223, 170, 0.28));
}

.timeline-list,
.milestone-list,
.feature-list {
  display: grid;
  gap: 1rem;
}

.timeline-list > div,
.milestone-list > div {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 18px;
  padding: 1.2rem 1.4rem;
}

.timeline-list span,
.milestone-list span {
  display: inline-block;
  font-weight: 700;
  color: var(--sage-700);
  margin-bottom: 0.35rem;
}

.cta-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.25rem;
  background: var(--white);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 26px;
  padding: 2rem 2.5rem;
  box-shadow: 0 18px 40px var(--shadow);
}

.site-footer {
  background: var(--sage-900);
  color: rgba(255,255,255,0.8);
  padding: 1.25rem 0;
}

.footer-wrap {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.page-hero {
  background: linear-gradient(135deg, rgba(125, 153, 117, 0.85), rgba(201, 165, 90, 0.45));
  color: var(--white);
  padding: 5rem 0 3rem;
}

.small-hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
}

.story-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 2rem;
  align-items: center;
}

.story-photo {
  min-height: 520px;
  border-radius: 30px;
  background-image: url("https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80");
  background-size: cover;
  background-position: center;
  box-shadow: 0 18px 40px var(--shadow);
}

.schedule-wrap {
  display: grid;
  gap: 1.5rem;
}

.schedule-item {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 1.5rem;
  align-items: start;
  background: var(--white);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 22px;
  padding: 1.4rem 1.4rem 1.4rem 0.8rem;
}

.day-box {
  width: 86px;
  height: 86px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--sage-300), var(--gold-300));
  color: var(--sage-900);
  font-weight: 700;
}

.schedule-item span {
  display: inline-block;
  color: var(--sage-700);
  font-weight: 600;
  margin-top: 0.5rem;
}

.gift-box,
.form-card {
  background: var(--white);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 26px;
  padding: 2rem;
  box-shadow: 0 18px 40px var(--shadow);
}

.gift-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

label {
  display: grid;
  gap: 0.55rem;
  font-weight: 600;
  color: var(--sage-900);
}

input,
select,
textarea {
  border: 1px solid rgba(47, 63, 52, 0.15);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  background: var(--ivory);
  color: var(--ink);
}

textarea {
  resize: vertical;
  min-height: 120px;
}

.faq-list {
  display: grid;
  gap: 1rem;
}

.faq-list details {
  background: var(--white);
  border: 1px solid rgba(47, 63, 52, 0.08);
  border-radius: 18px;
  padding: 1rem 1.25rem;
}

.faq-list summary {
  cursor: pointer;
  font-weight: 600;
  list-style: none;
}

.faq-list summary::-webkit-details-marker {
  display: none;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  position: relative;
  padding-left: 1.5rem;
}

.feature-list li::before {
  content: "✦";
  color: var(--gold-500);
  position: absolute;
  left: 0;
  top: 0;
}

@media (max-width: 820px) {
  .site-nav {
    display: none;
    position: absolute;
    top: 76px;
    right: 1rem;
    left: 1rem;
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(47, 63, 52, 0.08);
    border-radius: 18px;
    padding: 1rem;
    box-shadow: 0 14px 28px rgba(0,0,0,0.08);
    flex-direction: column;
    align-items: flex-start;
  }

  .site-nav.open {
    display: flex;
  }

  .nav-toggle {
    display: block;
  }

  .two-column,
  .story-layout,
  .three-up,
  .form-grid,
  .cta-box {
    grid-template-columns: 1fr;
    display: grid;
  }

  .schedule-item {
    grid-template-columns: 1fr;
  }

  .day-box {
    width: 72px;
    height: 72px;
  }
}
"},{