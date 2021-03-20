# TiktokAutoUploader - Complete
Automatically Edits Videos and Uploads to Tiktok with 1 line of code.

<center>
<image src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%">
</center>
  
#### Setup

> pip install -r requirements.txt


#### Notes

Please use chromedriver.exe provided as its source code has been edited to avoid bot detection on tiktok website.

Use only tiktok accounts that can be accessed through email password on browser, OAuth2.0 may not work, slightly probable.

Do not spam upload videos as tiktok will most likely ban you after this or during the act.

I am not responsible/ liable for any damages or problems or resulting effects you face using this tool or in relation with this tool, use at own risk. 



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
