
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useFirebaseConfig } from "@/context/FirebaseConfigContext";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Password form schema
const passwordFormSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Firebase config form schema (removed the apiKey field)
const configFormSchema = z.object({
  databaseURL: z.string().min(1, "Database URL is required"),
});

type ConfigFormValues = z.infer<typeof configFormSchema>;

export const FirebaseConfigForm = () => {
  const { config, updateConfig, verifyPassword } = useFirebaseConfig();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
    },
  });

  // Config form
  const configForm = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      databaseURL: config.databaseURL || "",
    },
  });

  const onUnlock = (data: PasswordFormValues) => {
    if (verifyPassword(data.password)) {
      setIsUnlocked(true);
      toast({
        title: "Success",
        description: "Admin access granted",
      });
      
      // Reset config form with current values when unlocked
      configForm.reset({
        databaseURL: config.databaseURL || "",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const onSubmitConfig = (data: ConfigFormValues) => {
    updateConfig({
      apiKey: config.apiKey, // Keep the existing API key
      databaseURL: data.databaseURL,
    });
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <Card className="p-4 bg-black/40 border border-orange-500/20 rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Lock className="h-4 w-4 mr-2" />
          Firebase Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isUnlocked ? (
          // Password form to unlock settings
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onUnlock)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Admin Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter admin password" 
                          className="bg-black/60 text-white border-orange-500/30 pr-10"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Unlock Settings
              </Button>
            </form>
          </Form>
        ) : (
          // Firebase config form (shown only when unlocked)
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(onSubmitConfig)} className="space-y-4">              
              <FormField
                control={configForm.control}
                name="databaseURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Firebase Database URL</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="text"
                        placeholder="Enter Firebase Database URL" 
                        className="bg-black/60 text-white border-orange-500/30"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Save Configuration
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  className="border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                  onClick={() => setIsUnlocked(false)}
                >
                  Lock Settings
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="pt-2 px-0 text-xs text-gray-400">
        Changes will require a page reload to take effect
      </CardFooter>
    </Card>
  );
};
