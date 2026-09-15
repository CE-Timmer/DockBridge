import { SpotifyPlayer } from "./../../components/Global/SpotifyPlayer.ts";

interface SyncedPosition {
  StartedSyncAt: number;
  Position: number;
}

let syncedPosition: SyncedPosition | null = null;
let lastLocalSample: { Position: number; SampledAt: number; TrackUri: string | null } | null = null;
let lastRawLocalSample: number | null = null;
let localSourceHealth: { LastChangeAt: number; ConsecutiveChanges: number; UsingState: boolean } | null = null;
let lastStateReading: { Position: number; ReadAt: number; WasPlaying: boolean } | null = null;
const syncTimings = [0.05, 0.1, 0.15, 0.75];
let canSyncNonLocalTimestamp = SpotifyPlayer?.IsPlaying ? syncTimings.length : 0;
const LOCAL_SOURCE_STALL_TIMEOUT = 500;
const LOCAL_SOURCE_RECOVERY_STREAK = 3;
const LOCAL_ANCHOR_RESYNC_THRESHOLD = 1000;

export const requestPositionSync = () => {
  try {
    const SpotifyPlatform = Spicetify.Platform;
    const startedAt = Date.now();
    const isLocallyPlaying = SpotifyPlatform.PlaybackAPI._isLocal;

    const getLocalPosition = () => {
      return SpotifyPlatform.PlayerAPI._contextPlayer
        .getPositionState({})
        .then(({ position }: { position: number }) => {
          // The local IPC source can return the same position for seconds.
          // Hold the timestamp from when that value first appeared so
          // GetProgress continues to extrapolate instead of being reset to it.
          const sampledAt = startedAt + (Date.now() - startedAt) / 2;
          const sampled = Number(position);
          const isPlaying = Spicetify.Player.isPlaying();
          const trackUri = SpotifyPlayer.GetUri() ?? null;
          const state = SpotifyPlatform.PlayerAPI._state;
          const stateReading = state
            ? isPlaying
              ? Number(state.positionAsOfTimestamp) + (sampledAt - Number(state.timestamp))
              : Number(state.positionAsOfTimestamp)
            : Number.NaN;

          let stateJumped = false;
          if (Number.isFinite(stateReading)) {
            if (lastStateReading?.WasPlaying && isPlaying) {
              const expected = lastStateReading.Position + (sampledAt - lastStateReading.ReadAt);
              stateJumped = Math.abs(stateReading - expected) > LOCAL_ANCHOR_RESYNC_THRESHOLD;
            }
            lastStateReading = { Position: stateReading, ReadAt: sampledAt, WasPlaying: isPlaying };
          }

          const changed = lastRawLocalSample !== sampled;
          lastRawLocalSample = sampled;
          if (isPlaying) {
            if (!localSourceHealth) {
              localSourceHealth = { LastChangeAt: sampledAt, ConsecutiveChanges: changed ? 1 : 0, UsingState: false };
            } else {
              localSourceHealth.ConsecutiveChanges = changed ? localSourceHealth.ConsecutiveChanges + 1 : 0;
              if (changed) localSourceHealth.LastChangeAt = sampledAt;
            }
            const stalled = sampledAt - localSourceHealth.LastChangeAt > LOCAL_SOURCE_STALL_TIMEOUT;
            if (localSourceHealth.UsingState && localSourceHealth.ConsecutiveChanges >= LOCAL_SOURCE_RECOVERY_STREAK) {
              localSourceHealth.UsingState = false;
            } else if (stalled) {
              localSourceHealth.UsingState = true;
            }
          } else if (localSourceHealth) {
            localSourceHealth.LastChangeAt = sampledAt;
            localSourceHealth.ConsecutiveChanges = 0;
          }

          if (localSourceHealth?.UsingState && isPlaying && Number.isFinite(stateReading)) {
            lastLocalSample = { Position: stateReading, SampledAt: sampledAt, TrackUri: trackUri };
            return { StartedSyncAt: sampledAt, Position: stateReading };
          }

          const anchorIsStale = lastLocalSample !== null && isPlaying &&
            (lastLocalSample.TrackUri !== trackUri || stateJumped);
          if (!lastLocalSample || lastLocalSample.Position !== sampled || !isPlaying || anchorIsStale) {
            lastLocalSample = { Position: sampled, SampledAt: sampledAt, TrackUri: trackUri };
          }
          return { StartedSyncAt: lastLocalSample.SampledAt, Position: lastLocalSample.Position };
        });
    };

    const getNonLocalPosition = () => {
      return (
        canSyncNonLocalTimestamp > 0
          ? SpotifyPlatform.PlayerAPI._contextPlayer.resume({})
          : Promise.resolve()
      ).then(() => {
        canSyncNonLocalTimestamp = Math.max(0, canSyncNonLocalTimestamp - 1);
        return {
          StartedSyncAt: startedAt,
          Position: Spicetify.Player.isPlaying()
            ? SpotifyPlatform.PlayerAPI._state.positionAsOfTimestamp +
              (Date.now() - SpotifyPlatform.PlayerAPI._state.timestamp)
            : SpotifyPlatform.PlayerAPI._state.positionAsOfTimestamp,
        };
      });
    };

    const sync = isLocallyPlaying ? getLocalPosition() : getNonLocalPosition();

    sync
      .then((position: SyncedPosition) => {
        syncedPosition = position;
      })
      .catch((error: unknown) => {
        console.error("Sync Position: Poll failed, More Details:", error);
      })
      .then(() => {
        const delay = isLocallyPlaying
          ? 1 / 60
          : canSyncNonLocalTimestamp === 0
            ? 1 / 60
            : syncTimings[syncTimings.length - canSyncNonLocalTimestamp];

        setTimeout(requestPositionSync, delay * 1000);
      });
  } catch (error) {
    console.error("Sync Position: Fail, More Details:", error);
    setTimeout(requestPositionSync, 1000);
  }
};

// Function to get the current progress
export default function GetProgress() {
  if (SpotifyPlayer.GetContentType() !== "track") {
    return Spicetify.Player.getProgress();
  }

  if (!syncedPosition) {
    console.error("Synced Position: Unavailable");
    if (SpotifyPlayer?._DEPRECATED_?.GetTrackPosition) {
      // Also added this backup in case, if the "sycedPosition" is unavailable, but the "_DEPRECATED_" version is available
      console.warn("Synced Position: Skip, Using DEPRECATED Version");
      return SpotifyPlayer._DEPRECATED_.GetTrackPosition();
    }
    console.warn("Synced Position: Skip, Returning 0");
    return 0;
  }

  const SpotifyPlatform = Spicetify.Platform;
  // const isLocallyPlaying = SpotifyPlatform.PlaybackAPI._isLocal;

  const { StartedSyncAt, Position } = syncedPosition;
  const now = Date.now();
  const deltaTime = now - StartedSyncAt;

  // Calculate and return the current track position
  if (!Spicetify.Player.isPlaying()) {
    return SpotifyPlatform.PlayerAPI._state.positionAsOfTimestamp; // Position remains static when paused
  }

  // Calculate and return the current track position
  const FinalPosition = Position + deltaTime;
  return FinalPosition + 85;
}

// DEPRECATED
export function _DEPRECATED___GetProgress() {
  // Ensure Spicetify is loaded and state is available
  if (!(Spicetify?.Player as any)?.origin?._state) {
    console.error("Spicetify Player state is not available.");
    return 0;
  }

  const state = (Spicetify.Player as any).origin._state;

  // Extract necessary properties from Spicetify Player state
  const positionAsOfTimestamp = state.positionAsOfTimestamp; // Last known position in ms
  const timestamp = state.timestamp; // Last known timestamp
  const isPaused = state.isPaused; // Playback state

  // Validate data integrity
  if (positionAsOfTimestamp == null || timestamp == null) {
    console.error("Playback state is incomplete.");
    return null;
  }

  const now = Date.now();

  // Calculate and return the current track position
  if (isPaused) {
    return positionAsOfTimestamp; // Position remains static when paused
  } else {
    return positionAsOfTimestamp + (now - timestamp);
  }
}
