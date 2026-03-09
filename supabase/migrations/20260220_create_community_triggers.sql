-- Trigger function to update community followers count
CREATE OR REPLACE FUNCTION update_community_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE communities
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = NEW.community_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE communities
        SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1)
        WHERE id = OLD.community_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for community_followers
DROP TRIGGER IF EXISTS on_community_follower_change ON community_followers;
CREATE TRIGGER on_community_follower_change
AFTER INSERT OR DELETE ON community_followers
FOR EACH ROW
EXECUTE FUNCTION update_community_followers_count();

-- Trigger function to update channel followers count
CREATE OR REPLACE FUNCTION update_channel_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE channels
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = NEW.channel_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE channels
        SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1)
        WHERE id = OLD.channel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for channel_followers
DROP TRIGGER IF EXISTS on_channel_follower_change ON channel_followers;
CREATE TRIGGER on_channel_follower_change
AFTER INSERT OR DELETE ON channel_followers
FOR EACH ROW
EXECUTE FUNCTION update_channel_followers_count();
