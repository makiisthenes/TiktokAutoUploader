from TiktokBot import TiktokBot
if __name__ == "__main__":
    # Example Usage
 
    
    tiktok_bot = TiktokBot("VideosDirPath")  # VideosDirPath, is the directory where images edited will be saved.
        
    # Use a video from your directory.
    # tiktok_bot.upload.uploadVideo("test1.mp4", "This is test", 1, 2, private=True)

    # Or use youtube url as video source. [Simpsons Meme 1:16 - 1:32 Example]

    # We can add task schedule from read from a csv: url, caption, startTime, endTime, time_to_release.
    #

    tiktok_bot.upload.uploadVideo("https://www.youtube.com/watch?v=17IQnHON1vc","Peter becomes a Uber Driver!! \nPart1", 4, 45, private=False, test=False)



    # tiktok_bot.schedule.printSchedule()
    # playlist = https://www.youtube.com/playlist?list=PLiMQfyKvRdimHicuw1cAmwS7d_UiANXcj
    '''
        while True:
            url = input("Enter a url for uploading:: ")
            caption = input("Enter a caption for the video:: ")
            timeStart = input("Enter Start Time:: ")
            timeEnd = input("Enter End Time:: ")
            # Add this video into the csv so that you can upload yourself, by putting test parameter on and just showing you.
            tiktok_bot.schedule.scheduleVideo(url, caption, timeStart, timeEnd)
    '''

    # tiktok_bot.schedule.submit_all_schedule()


    # tiktok_bot.schedule.scheduleVideo("https://www.youtube.com/watch?v=yxErIigWRv4", "why do these never have my name!!", 115, 125)
    # Default params: Videos are separated by a day each "", time is constant: "20:10" ;
