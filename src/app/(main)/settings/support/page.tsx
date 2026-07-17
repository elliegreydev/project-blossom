"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddPrivateLinkSheet from "@/components/AddPrivateLinkSheet";
import { db, LOCAL_PROFILE_ID, deletePrivateLink } from "@/lib/db";
import { resourcesForRegion, legalContextFor, CATEGORY_LABELS } from "@/lib/regionResources";
import formStyles from "@/components/settingsForm.module.css";
import featureStyles from "@/components/feature.module.css";
import styles from "./support.module.css";

export default function SupportSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const links = useLiveQuery(() => db.privateLinks.toArray(), []);
  const [addOpen, setAddOpen] = useState(false);

  if (!profile || links === undefined) return null;

  const resources = resourcesForRegion(profile.region, profile.subregion);
  const legalContext = legalContextFor(profile.region, profile.subregion);
  const placeLabel = [profile.subregion, profile.region].filter(Boolean).join(", ");

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Help & support" backHref="/settings" />

      <div className={styles.emergencyBanner}>
        If you&apos;re in immediate danger, please contact your local emergency
        services. Aurora and Blossom can&apos;t monitor you or contact anyone on
        your behalf.
      </div>

      <div className={featureStyles.section}>
        <div className={featureStyles.sectionTitle}>
          {placeLabel ? `${placeLabel} resources` : "Resources"}
        </div>

        {legalContext && (
          <div className={styles.legalContext}>
            <span className={styles.legalContextLabel}>Current legal context</span>
            <span className={styles.legalContextNote}>{legalContext.note}</span>
            <a
              href={legalContext.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.resourceMeta}
              style={{ textDecoration: "underline" }}
            >
              Check the latest status
            </a>
            <span className={styles.resourceReviewed}>As of {legalContext.lastReviewedAt}</span>
          </div>
        )}

        {resources.length === 0 ? (
          <p className={formStyles.hint}>
            {profile.region
              ? "We don't have local organizations for your area yet - support resources are still being added."
              : "Set your country in Settings to see local support resources."}
          </p>
        ) : (
          <div className={featureStyles.list}>
            {resources.map((r) => (
              <div key={r.id} className={styles.resourceItem}>
                <span className={styles.resourceCategory}>{CATEGORY_LABELS[r.category]}</span>
                <span className={styles.resourceName}>
                  {r.cityName && <span className={styles.resourceCity}>{r.cityName} · </span>}
                  {r.orgName}
                </span>
                <span className={styles.resourceMeta}>{r.contactInfo}</span>
                {r.availability && <span className={styles.resourceMeta}>{r.availability}</span>}
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.resourceMeta}
                  style={{ textDecoration: "underline" }}
                >
                  {r.sourceUrl}
                </a>
                <span className={styles.resourceReviewed}>Last reviewed {r.lastReviewedAt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={featureStyles.section}>
        <div className={featureStyles.sectionTitle}>Your saved links</div>
        {links.length === 0 ? (
          <p className={formStyles.hint}>Save your own private resources here.</p>
        ) : (
          <div className={featureStyles.list}>
            {links.map((link) => (
              <div key={link.id} className={featureStyles.item}>
                <div className={featureStyles.itemRow}>
                  <span className={featureStyles.itemTitle}>{link.label}</span>
                  <button
                    type="button"
                    className={featureStyles.linkButton}
                    onClick={() => deletePrivateLink(link.id)}
                  >
                    Remove
                  </button>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={featureStyles.itemMeta}
                  style={{ textDecoration: "underline" }}
                >
                  {link.url}
                </a>
                {link.note && <div className={featureStyles.itemBody}>{link.note}</div>}
              </div>
            ))}
          </div>
        )}
        <button className={featureStyles.addButton} onClick={() => setAddOpen(true)}>
          + Save a link
        </button>
      </div>

      {addOpen && <AddPrivateLinkSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}
