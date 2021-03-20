# TiktokAutoUploader - Complete
Automatically Edits Videos and Uploads to Tiktok with 1 line of code.

#### Setup

> pip install -r requirements.txt


### Basic Usage Example

> if __name__ == "__main__":
> 
>     # Example Usage
>     
>     tiktok_bot = Main("VideosDirPath")
>     
>     # Use a video from your directory.
>     
>     tiktok_bot.uploadVideo("test1.mp4", "This is text \n overlay on \n the video", 1, 45)
> 
>     # Or use youtube url as video source. [Simpsons Meme 1:16 - 1:32 Example]
>     
>     tiktok_bot.uploadVideo("https://www.youtube.com/watch?v=OGEouryaQ3g", "TextOverlay", startTime=76, endTime=92, private=False)
