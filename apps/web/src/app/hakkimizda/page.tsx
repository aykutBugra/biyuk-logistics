"use client";

import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import { getAccessToken } from "@/lib/auth/auth-storage";

type UserRow = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  roles: string[];
};

export default function Page() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const accessToken = getAccessToken();

      if (!accessToken) {
        setError("Bu sayfayi gormek icin once giris yapmaniz gerekir.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch<UserRow[]>("/users", {
          accessToken,
        });

        setUsers(data);
      } catch (fetchError) {
        if (fetchError instanceof ApiClientError) {
          setError(fetchError.message);
        } else {
          setError("Kullanicilar yuklenirken beklenmeyen bir hata olustu.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, []);

  if (isLoading) {
    return <div className="p-6">Kullanicilar yukleniyor...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kullanici Listesi</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">ID</th>
              <th className="border border-gray-300 p-2 text-left">Ad</th>
              <th className="border border-gray-300 p-2 text-left">Soyad</th>
              <th className="border border-gray-300 p-2 text-left">Mail</th>
              <th className="border border-gray-300 p-2 text-left">
                Kullanici Adi
              </th>
              <th className="border border-gray-300 p-2 text-left">Telefon</th>
              <th className="border border-gray-300 p-2 text-left">Roller</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border border-gray-300 p-2">{user.id}</td>
                <td className="border border-gray-300 p-2">{user.ad}</td>
                <td className="border border-gray-300 p-2">{user.soyad}</td>
                <td className="border border-gray-300 p-2">{user.mail}</td>
                <td className="border border-gray-300 p-2">
                  {user.kullaniciAdi}
                </td>
                <td className="border border-gray-300 p-2">
                  {user.telefonNumarasi ?? "-"}
                </td>
                <td className="border border-gray-300 p-2">
                  {user.roles.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
