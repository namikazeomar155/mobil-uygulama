using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class Program
{
    [DllImport("user32.dll")]
    private static extern bool SetProcessDPIAware();

    [STAThread]
    static void Main(string[] args)
    {
        try
        {
            try { SetProcessDPIAware(); } catch { }

            Rectangle bounds = Screen.PrimaryScreen.Bounds;
            if (bounds.Width <= 0 || bounds.Height <= 0)
            {
                bounds = new Rectangle(0, 0, 1920, 1080);
            }

            using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size);
                }

                int targetW = 1080;
                int targetH = (int)(bounds.Height * (1080.0 / bounds.Width));

                using (Bitmap resized = new Bitmap(targetW, targetH))
                {
                    using (Graphics g2 = Graphics.FromImage(resized))
                    {
                        g2.InterpolationMode = InterpolationMode.Bilinear;
                        g2.DrawImage(bmp, 0, 0, targetW, targetH);
                    }

                    ImageCodecInfo jpegCodec = null;
                    foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
                    {
                        if (codec.MimeType == "image/jpeg")
                        {
                            jpegCodec = codec;
                            break;
                        }
                    }

                    EncoderParameters encoderParams = new EncoderParameters(1);
                    encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 75L);

                    using (MemoryStream ms = new MemoryStream())
                    {
                        if (jpegCodec != null)
                        {
                            resized.Save(ms, jpegCodec, encoderParams);
                        }
                        else
                        {
                            resized.Save(ms, ImageFormat.Jpeg);
                        }

                        byte[] bytes = ms.ToArray();
                        Console.Write(Convert.ToBase64String(bytes));
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.Error.Write("ERR:" + ex.Message);
            Environment.Exit(1);
        }
    }
}
