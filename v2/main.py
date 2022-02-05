from tiktok_uploader.TiktokBot import TiktokBot

# Tiktok bot must always instantiated in a main loop, this is a workaround a underlying issue.
if __name__ == "__main__":
    tiktokbot = TiktokBot()
    tiktokbot.uploadVideo("https://www.youtube.com/watch?v=31HfP81oWDI", "Testing with v2")
