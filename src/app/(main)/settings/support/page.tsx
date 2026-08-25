"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddPrivateLinkSheet from "@/components/AddPrivateLinkSheet";
import { db, LOCAL_PROFILE_ID, deletePrivateLink, updateProfile } from "@/lib/db";
import {
  COUNTRIES,
  SUBREGIONS,
  resourcesForRegion,
  legalContextFor,
  CATEGORY_LABELS,
} from "@/lib/regionResources";
import formStyles from "@/components/settingsForm.module.css";
import featureStyles from "@/components/feature.module.css";
import styles from "./support.module.css";

export default function SupportSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const links = useLiveQuery(() => db.privateLinks.toArray(), []);
  const cachedResources = useLiveQuery(() => db.cachedRegionResources.toArray(), []);
  const cachedLegalNotes = useLiveQuery(() => db.cachedLegalContextNotes.toArray(), []);
  const [addOpen, setAddOpen] = useState(false);

  if (!profile || links === undefined || cachedResources === undefined || cachedLegalNotes === undefined)
    return null;

  const resources = resourcesForRegion(cachedResources, profile.region, profile.subregion);
  const legalContext = legalContextFor(cachedLegalNotes, profile.region, profile.subregion);
  const placeLabel = [profile.subregion, profile.region].filter(Boolean).join(", ");

  // How much is sitting behind the subregion choice. Anybody who skipped the
  // region step, or chose "prefer not to say" for their state, sees only the
  // national entries; in the US that is 88 of 91 services. Counting them means
  // nobody has to guess that the list gets longer.
  const hiddenLocal = profile.region && !profile.subregion
    ? cachedResources.filter((r) => r.country === profile.region && r.subregion !== null).length
    : 0;

  const subregionOptions = profile.region
    ? SUBREGIONS[profile.region as keyof typeof SUBREGIONS]
    : undefined;
  const subregionLabel =
    profile.region === "United States"
      ? "State"
      : profile.region === "Canada"
        ? "Province or territory"
        : profile.region === "Australia"
          ? "State or territory"
          : "Nation";
  const subregionWord =
    profile.region === "United States"
      ? "state"
      : profile.region === "Canada"
        ? "province"
        : profile.region === "Australia"
          ? "state"
          : "nation";

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Help & support" backHref="/settings/about" />

      <div className={styles.emergencyBanner}>
        If you&apos;re in immediate danger, please contact your local emergency
        services. Aurora and Blossom can&apos;t monitor you or contact anyone on
        your behalf.
      </div>

      <div className={featureStyles.section}>
        <div className={featureStyles.sectionTitle}>
          {placeLabel ? `${placeLabel} resources` : "Resources"}
        </div>

        {/* The same picker as the crisis page, so the two screens answer the
            same question the same way. The difference is that this one saves:
            it writes to the profile, so a choice made here is a choice made
            everywhere, rather than sending somebody off to another screen to
            unlock a list they are already looking at. */}
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="support-country">Where are you?</label>
          <select
            id="support-country"
            className={formStyles.select}
            value={profile.region ?? ""}
            onChange={(e) =>
              updateProfile({ region: e.target.value || null, subregion: null })
            }
          >
            <option value="">Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {subregionOptions && (
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="support-subregion">{subregionLabel}</label>
            <select
              id="support-subregion"
              className={formStyles.select}
              value={profile.subregion ?? ""}
              onChange={(e) => updateProfile({ subregion: e.target.value || null })}
            >
              <option value="">Whole country</option>
              {subregionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Only worth saying when there is a picker above to say it about. A
            country with no subregions in the list would otherwise be pointed
            at a control that isn't on the screen.

            hiddenLocal is every subregion-scoped service in the country, not
            the number one choice hands back, so the sentence must not promise
            them all. "Choosing your state shows 88 more services" is read as
            88, then California returns two, and the screen has lied to
            somebody looking for help. Same wording problem lives on the crisis
            page, which is where this was copied from. */}
        {subregionOptions && hiddenLocal > 0 && (
          <p className={formStyles.hint}>
            {hiddenLocal} more{" "}
            {hiddenLocal === 1 ? "service is" : "services are"} listed under
            individual {subregionWord}s. Choose yours above to see the ones near you.
          </p>
        )}

        {profile.region && (
          <p className={formStyles.hint}>
            This is saved to your profile, so you only have to pick it once.
          </p>
        )}

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
              ? "We don't have local organisations for your area yet - support resources are still being added."
              : "Choose a country above to see local support resources."}
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
