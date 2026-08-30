<template>
  <main class="privacy-policy">
    <header class="privacy-header">
      <div class="container">
        <p class="eyebrow">MAAS</p>
        <h1>Privacy Policy</h1>
        <p class="last-updated">
          Last updated: {{ lastUpdated }}
        </p>

        <p class="intro">
          We take the protection of your personal data seriously. This Privacy
          Policy explains how {{ operatorName }} collects, uses, stores and
          shares personal data when you use our Mobility as a Service (MaaS)
          platform, website, mobile application and mobility services.
        </p>
      </div>
    </header>

    <div class="container policy-layout">
      <aside class="policy-navigation" aria-label="Privacy policy navigation">
        <nav>
          <a
            v-for="section in sections"
            :key="section.id"
            :href="`#${section.id}`"
          >
            {{ section.title }}
          </a>
        </nav>
      </aside>

      <article class="policy-content">
        <!-- 1. General information -->
        <section id="general-information">
          <h2>1. General Information</h2>

          <p>
            This Privacy Policy applies to the MaaS platform and related
            services provided by {{ operatorName }}. These services may
            include journey planning, booking, ticketing, payment,
            mobility-provider integration, trip management, real-time
            mobility information and personalised mobility services.
          </p>

          <p>
            We process personal data in accordance with applicable data
            protection legislation, including the General Data Protection
            Regulation (GDPR), where applicable.
          </p>

          <p>
            This policy explains what information we process, why we process
            it, how long we retain it, who may receive it and what rights you
            have in relation to your personal data.
          </p>
        </section>

        <!-- 2. Controller -->
        <section id="controller">
          <h2>2. Data Controller</h2>

          <p>
            The controller responsible for the processing of your personal
            data is:
          </p>

          <address class="contact-card">
            <strong>{{ operatorName }}</strong><br />
            {{ operatorAddress }}<br />
            {{ operatorCity }}<br />
            Email:
            <a :href="`mailto:${privacyEmail}`">{{ privacyEmail }}</a><br />
            Phone: {{ operatorPhone }}
          </address>

          <p>
            If a particular mobility service is provided by a third-party
            mobility operator, that operator may act as an independent
            controller for the processing it carries out for its own service.
          </p>
        </section>

        <!-- 3. Definitions -->
        <section id="definitions">
          <h2>3. Definitions</h2>

          <dl>
            <div>
              <dt>Personal data</dt>
              <dd>
                Information relating to an identified or identifiable person,
                such as an account identifier, contact details, location data
                or journey history.
              </dd>
            </div>

            <div>
              <dt>Processing</dt>
              <dd>
                Any operation performed on personal data, including
                collection, recording, storage, use, transmission and
                deletion.
              </dd>
            </div>

            <div>
              <dt>MaaS platform</dt>
              <dd>
                The digital service that enables users to discover, plan,
                book, pay for and manage journeys using one or more mobility
                services.
              </dd>
            </div>

            <div>
              <dt>Provenance</dt>
              <dd>
                Information describing the origin, history or sequence of
                mobility data and journey events.
              </dd>
            </div>
          </dl>
        </section>

        <!-- 4. Data collected -->
        <section id="data-collected">
          <h2>4. Personal Data We Process</h2>

          <p>
            Depending on the services you use and the settings you select,
            we may process the following categories of data:
          </p>

          <div class="data-grid">
            <div class="data-card">
              <h3>Account information</h3>
              <ul>
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>User or account identifier</li>
                <li>Authentication information</li>
              </ul>
            </div>

            <div class="data-card">
              <h3>Mobility information</h3>
              <ul>
                <li>Journey requests</li>
                <li>Selected routes</li>
                <li>Transport modes</li>
                <li>Bookings and tickets</li>
                <li>Journey history</li>
              </ul>
            </div>

            <div class="data-card">
              <h3>Location information</h3>
              <ul>
                <li>Origin and destination</li>
                <li>Current or approximate location</li>
                <li>Journey-related locations</li>
                <li>Location timestamps</li>
              </ul>
            </div>

            <div class="data-card">
              <h3>Transaction information</h3>
              <ul>
                <li>Purchase history</li>
                <li>Ticket information</li>
                <li>Payment status</li>
                <li>Billing information</li>
              </ul>
            </div>

            <div class="data-card">
              <h3>Technical information</h3>
              <ul>
                <li>IP address</li>
                <li>Device information</li>
                <li>Application version</li>
                <li>Crash and diagnostic information</li>
              </ul>
            </div>

            <div class="data-card">
              <h3>Preferences</h3>
              <ul>
                <li>Accessibility preferences</li>
                <li>Mobility preferences</li>
                <li>Saved locations</li>
                <li>Privacy and recording preferences</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 5. MaaS-specific recording -->
        <section id="mobility-recording">
          <h2>5. Mobility Data and Journey Recording</h2>

          <p>
            The MaaS platform may process information about your mobility
            activities to provide journey planning, booking, ticketing,
            navigation and other requested services.
          </p>

          <h3>5.1 Recording time</h3>

          <p>
            Where supported, users may configure when mobility events are
            recorded. Depending on the service, this may include journey
            start, journey completion, booking, cancellation, transfer or
            other mobility events.
          </p>

          <h3>5.2 Recording events</h3>

          <p>
            The platform may allow you to select which mobility events are
            recorded. Events that are not required to provide a requested
            service should not be recorded solely for convenience.
          </p>

          <h3>5.3 Provenance granularity</h3>

          <p>
            Where technically supported, you may choose the level of detail
            associated with mobility provenance. For example, the platform
            may provide:
          </p>

          <ul>
            <li>
              <strong>Basic:</strong> overall journey information only.
            </li>
            <li>
              <strong>Standard:</strong> journey stages and transport modes.
            </li>
            <li>
              <strong>Detailed:</strong> individual journey events and
              transfers.
            </li>
          </ul>

          <p class="privacy-note">
            Choosing a lower level of provenance may limit certain MaaS
            features, such as detailed journey history, analytics or
            personalised mobility recommendations.
          </p>
        </section>

        <!-- 6. Purposes -->
        <section id="purposes">
          <h2>6. Purposes of Processing</h2>

          <p>We may process personal data for the following purposes:</p>

          <ul>
            <li>Creating and managing your MaaS account.</li>
            <li>Planning and optimising journeys.</li>
            <li>Providing real-time mobility information.</li>
            <li>Booking mobility services.</li>
            <li>Issuing and managing tickets.</li>
            <li>Processing payments.</li>
            <li>Managing journey and service history.</li>
            <li>Providing customer support.</li>
            <li>Improving reliability, security and performance.</li>
            <li>Preventing fraud and misuse.</li>
            <li>Meeting legal and regulatory obligations.</li>
            <li>
              Providing personalised recommendations where permitted and
              enabled.
            </li>
          </ul>
        </section>

        <!-- 7. Legal basis -->
        <section id="legal-basis">
          <h2>7. Legal Basis for Processing</h2>

          <p>
            Depending on the circumstances, processing may be based on one or
            more of the following legal grounds:
          </p>

          <div class="legal-basis-list">
            <div>
              <h3>Consent</h3>
              <p>
                Where you have provided consent for a specific processing
                activity. You may withdraw consent at any time.
              </p>
            </div>

            <div>
              <h3>Contract</h3>
              <p>
                Where processing is necessary to provide a MaaS service you
                have requested or to perform a contract with you.
              </p>
            </div>

            <div>
              <h3>Legal obligation</h3>
              <p>
                Where processing is required to comply with applicable law.
              </p>
            </div>

            <div>
              <h3>Legitimate interests</h3>
              <p>
                Where processing is necessary for legitimate interests such
                as service security, fraud prevention or system improvement,
                provided that your rights and interests are appropriately
                protected.
              </p>
            </div>
          </div>
        </section>

        <!-- 8. Data minimisation -->
        <section id="privacy-by-design">
          <h2>8. Privacy by Design and Data Minimisation</h2>

          <p>
            Privacy is considered throughout the design and operation of the
            MaaS platform. We aim to collect and process only the personal
            data necessary for the relevant service.
          </p>

          <ul>
            <li>
              Users can control available mobility-data recording settings.
            </li>
            <li>
              Provenance may be stored at different levels of granularity.
            </li>
            <li>
              Location information is processed only where necessary for the
              requested mobility functionality.
            </li>
            <li>
              Data is retained only for as long as necessary for its intended
              purpose or as required by law.
            </li>
            <li>
              Where possible, analytics and service-improvement data is
              aggregated or anonymised.
            </li>
          </ul>
        </section>

        <!-- 9. Sharing -->
        <section id="data-sharing">
          <h2>9. Sharing and Disclosure of Data</h2>

          <p>
            MaaS services may require cooperation between multiple mobility
            providers. Depending on the service you request, relevant data
            may therefore be shared with:
          </p>

          <ul>
            <li>Public transport operators.</li>
            <li>Bike and scooter-sharing providers.</li>
            <li>Car-sharing providers.</li>
            <li>Taxi and ride-hailing providers.</li>
            <li>Payment service providers.</li>
            <li>Cloud and IT service providers.</li>
            <li>Customer-support providers.</li>
            <li>Authorities where legally required.</li>
          </ul>

          <p>
            We only share data that is necessary for the relevant purpose and
            require appropriate contractual, technical and organisational
            safeguards where applicable.
          </p>
        </section>

        <!-- 10. International transfers -->
        <section id="international-transfers">
          <h2>10. International Data Transfers</h2>

          <p>
            Where personal data is transferred outside the applicable
            jurisdiction or European Economic Area, we will use appropriate
            safeguards required by applicable data protection law.
          </p>

          <p>
            Where required, these safeguards may include adequacy decisions,
            standard contractual clauses or other legally recognised transfer
            mechanisms.
          </p>
        </section>

        <!-- 11. Retention -->
        <section id="retention">
          <h2>11. Data Retention</h2>

          <p>
            We retain personal data only for as long as necessary to fulfil
            the purpose for which it was collected, to provide the requested
            service, to meet contractual or legal requirements, or to
            establish, exercise or defend legal claims.
          </p>

          <table>
            <thead>
              <tr>
                <th>Data type</th>
                <th>Typical purpose</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Account data</td>
                <td>Account and service management</td>
                <td>While the account is active and as required by law</td>
              </tr>
              <tr>
                <td>Booking and ticket data</td>
                <td>Service delivery and accounting</td>
                <td>As required for contractual and legal purposes</td>
              </tr>
              <tr>
                <td>Journey history</td>
                <td>User-selected mobility history</td>
                <td>According to user settings and applicable requirements</td>
              </tr>
              <tr>
                <td>Detailed provenance</td>
                <td>Journey reconstruction and requested features</td>
                <td>According to the selected provenance setting</td>
              </tr>
              <tr>
                <td>Security logs</td>
                <td>Security and fraud prevention</td>
                <td>For the period necessary for security purposes</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 12. Security -->
        <section id="security">
          <h2>12. Data Security</h2>

          <p>
            We use appropriate technical and organisational measures designed
            to protect personal data against unauthorised access, alteration,
            disclosure, loss or destruction.
          </p>

          <p>
            Depending on the service, measures may include access controls,
            authentication, encryption in transit, secure storage, monitoring,
            backups and security testing.
          </p>
        </section>

        <!-- 13. User rights -->
        <section id="user-rights">
          <h2>13. Your Data Protection Rights</h2>

          <p>
            Subject to applicable law, you may have the following rights:
          </p>

          <ul>
            <li>Right to access your personal data.</li>
            <li>Right to correct inaccurate or incomplete data.</li>
            <li>Right to request deletion of your personal data.</li>
            <li>Right to restrict certain processing.</li>
            <li>Right to object to certain processing.</li>
            <li>Right to data portability.</li>
            <li>Right to withdraw consent where processing is consent-based.</li>
          </ul>

          <p>
            You can submit a privacy request by contacting
            <a :href="`mailto:${privacyEmail}`">{{ privacyEmail }}</a>.
          </p>
        </section>

        <!-- 14. Location -->
        <section id="location-data">
          <h2>14. Location Data</h2>

          <p>
            Location information can be essential to MaaS functionality, for
            example when calculating routes, displaying nearby services or
            providing navigation.
          </p>

          <p>
            Where location processing is optional, you can control access to
            location information through the application and/or your device
            settings.
          </p>

          <p>
            Disabling location access may prevent certain features from
            functioning correctly.
          </p>
        </section>

        <!-- 15. Cookies -->
        <section id="cookies">
          <h2>15. Cookies and Similar Technologies</h2>

          <p>
            Our website and application may use cookies or similar
            technologies for essential functionality, security, preferences,
            analytics and, where applicable, personalised services.
          </p>

          <p>
            Where consent is required, non-essential cookies will only be
            activated after you provide the appropriate consent. You may
            change your preferences through the available cookie settings.
          </p>
        </section>

        <!-- 16. Children -->
        <section id="children">
          <h2>16. Children</h2>

          <p>
            Our services are not intended to knowingly collect personal data
            from children except where permitted and appropriately protected
            under applicable law.
          </p>
        </section>

        <!-- 17. Automated decision making -->
        <section id="automated-decisions">
          <h2>17. Automated Decision-Making</h2>

          <p>
            Some MaaS features may use automated processing to calculate
            routes, estimate travel times, rank mobility options or provide
            recommendations.
          </p>

          <p>
            Where automated processing constitutes legally significant
            decision-making under applicable data protection law, we will
            provide the information and safeguards required by law.
          </p>
        </section>

        <!-- 18. Changes -->
        <section id="changes">
          <h2>18. Changes to This Privacy Policy</h2>

          <p>
            We may update this Privacy Policy when our services, technologies
            or legal obligations change. The current version will be made
            available through the MaaS platform.
          </p>

          <p>
            Where required, we will notify you of material changes and obtain
            consent where legally necessary.
          </p>
        </section>

        <!-- 19. Contact -->
        <section id="contact">
          <h2>19. Contact</h2>

          <p>
            If you have questions about this Privacy Policy or how we process
            your personal data, please contact:
          </p>

          <address class="contact-card">
            <strong>{{ operatorName }}</strong><br />
            {{ operatorAddress }}<br />
            {{ operatorCity }}<br />
            Email:
            <a :href="`mailto:${privacyEmail}`">{{ privacyEmail }}</a><br />
            Phone: {{ operatorPhone }}
          </address>
        </section>
      </article>
    </div>
  </main>
</template>

<script setup>
const operatorName = 'MaaS Operator'
const operatorAddress = '123 Mobility Street'
const operatorCity = 'City, Country'
const operatorPhone = '+00 000 000 0000'
const privacyEmail = 'privacy@maas.example'

const lastUpdated = '15 August 2026'

const sections = [
  { id: 'general-information', title: '1. General Information' },
  { id: 'controller', title: '2. Data Controller' },
  { id: 'definitions', title: '3. Definitions' },
  { id: 'data-collected', title: '4. Personal Data We Process' },
  { id: 'mobility-recording', title: '5. Mobility Data and Journey Recording' },
  { id: 'purposes', title: '6. Purposes of Processing' },
  { id: 'legal-basis', title: '7. Legal Basis for Processing' },
  { id: 'privacy-by-design', title: '8. Privacy by Design' },
  { id: 'data-sharing', title: '9. Sharing and Disclosure' },
  { id: 'international-transfers', title: '10. International Transfers' },
  { id: 'retention', title: '11. Data Retention' },
  { id: 'security', title: '12. Data Security' },
  { id: 'user-rights', title: '13. Your Data Protection Rights' },
  { id: 'location-data', title: '14. Location Data' },
  { id: 'cookies', title: '15. Cookies' },
  { id: 'children', title: '16. Children' },
  { id: 'automated-decisions', title: '17. Automated Decision-Making' },
  { id: 'changes', title: '18. Changes to This Privacy Policy' },
  { id: 'contact', title: '19. Contact' }
]
</script>

<style scoped>
.privacy-policy {
  min-height: 100vh;
  background: #fff;
  color: #202124;
  line-height: 1.7;
}

.container {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.privacy-header {
  padding: 72px 0 56px;
  background: #f5f7f8;
  border-bottom: 1px solid #e1e4e6;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(36px, 5vw, 56px);
  line-height: 1.1;
}

.last-updated {
  margin: 16px 0 0;
  color: #666;
  font-size: 14px;
}

.intro {
  max-width: 780px;
  margin: 28px 0 0;
  font-size: 18px;
}

.policy-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 760px);
  gap: 72px;
  padding-top: 64px;
  padding-bottom: 96px;
}

.policy-navigation {
  position: sticky;
  top: 24px;
  align-self: start;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.policy-navigation nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.policy-navigation a {
  color: #555;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
}

.policy-navigation a:hover {
  color: #111;
}

.policy-content section {
  margin-bottom: 64px;
  scroll-margin-top: 32px;
}

h2 {
  margin: 0 0 20px;
  font-size: 28px;
  line-height: 1.25;
}

h3 {
  margin: 28px 0 10px;
  font-size: 19px;
  line-height: 1.4;
}

p {
  margin: 0 0 18px;
}

ul {
  padding-left: 22px;
}

li {
  margin-bottom: 8px;
}

address {
  font-style: normal;
}

.contact-card {
  margin: 24px 0;
  padding: 20px 24px;
  background: #f5f7f8;
  border-radius: 8px;
}

.contact-card a {
  color: inherit;
}

dl {
  margin: 0;
}

dl > div {
  margin-bottom: 24px;
}

dt {
  margin-bottom: 4px;
  font-weight: 700;
}

dd {
  margin: 0;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.data-card {
  padding: 22px;
  border: 1px solid #e1e4e6;
  border-radius: 8px;
}

.data-card h3 {
  margin-top: 0;
}

.data-card ul {
  margin-bottom: 0;
}

.legal-basis-list {
  display: grid;
  gap: 20px;
}

.legal-basis-list > div {
  padding: 20px;
  background: #f8f9fa;
  border-left: 3px solid #222;
}

.legal-basis-list h3 {
  margin-top: 0;
}

.privacy-note {
  padding: 18px 20px;
  background: #f5f7f8;
  border-radius: 8px;
}

table {
  width: 100%;
  margin-top: 24px;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #ddd;
}

th {
  font-weight: 700;
  background: #f5f7f8;
}

@media (max-width: 900px) {
  .policy-layout {
    display: block;
  }

  .policy-navigation {
    position: static;
    margin-bottom: 48px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e1e4e6;
  }

  .policy-navigation nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .container {
    width: min(100% - 28px, 1180px);
  }

  .privacy-header {
    padding: 48px 0 40px;
  }

  .policy-layout {
    padding-top: 40px;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }

  .policy-navigation nav {
    display: flex;
  }

  table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
